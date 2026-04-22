import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { calculateOTRate } from "@/lib/calculators/report"

type ApprovalLevel = "L1" | "L2"

const APPROVAL_TERMINAL_STATUSES = new Set([
  "DRAFT",
  "RETURNED_L1",
  "RETURNED_L2",
  "APPROVED_FINAL",
  "CLOSED",
  "CANCELLED",
])

const REPORT_APPROVAL_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      userId: true,
      teamManagerId: true,
      companyEmail: true,
      personalEmail: true,
      user: {
        select: {
          email: true,
        },
      },
      contracts: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { baseSalary: true },
      },
    },
  },
  leaveType: {
    select: {
      id: true,
      defaultDays: true,
      isPaid: true,
    },
  },
} satisfies Prisma.ReportInclude

type ReportForApproval = Prisma.ReportGetPayload<{
  include: typeof REPORT_APPROVAL_INCLUDE
}>

export class ReportApprovalError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ReportApprovalError"
    this.status = status
  }
}

async function loadLockedReport(
  tx: Prisma.TransactionClient,
  reportId: string
): Promise<ReportForApproval> {
  await tx.$queryRaw`SELECT id FROM "reports" WHERE id = ${reportId} FOR UPDATE`

  const report = await tx.report.findUnique({
    where: { id: reportId },
    include: REPORT_APPROVAL_INCLUDE,
  })

  if (!report) {
    throw new ReportApprovalError("Không tìm thấy báo cáo", 404)
  }

  return report
}

async function createFinalApprovalArtifacts(
  tx: Prisma.TransactionClient,
  report: ReportForApproval,
  actorUserId: string
) {
  let payrollItemId = report.payrollItemId
  let payrollPeriodId = report.payrollPeriodId

  const payload = report.payload as Record<string, unknown>
  const shouldCreatePayrollItem =
    !payrollItemId &&
    (report.type === "BUSINESS_TRIP" || report.type === "OVERTIME")

  if (shouldCreatePayrollItem) {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    let period = await tx.payrollPeriod.findUnique({
      where: { month_year: { month, year } },
    })

    if (!period) {
      period = await tx.payrollPeriod.create({
        data: { month, year, createdBy: actorUserId },
      })
    }

    if (period.status !== "DRAFT" && period.status !== "SUBMITTED") {
      console.log(
        `[Report] WARNING: PayrollPeriod ${month}/${year} is ${period.status}, creating item anyway`
      )
    }

    const empPayroll = await tx.employeePayroll.findUnique({
      where: {
        periodId_employeeId: {
          periodId: period.id,
          employeeId: report.employeeId,
        },
      },
    })

    if (empPayroll) {
      let itemType: string
      let amount = 0

      if (report.type === "BUSINESS_TRIP") {
        itemType = "BUSINESS_TRIP"
        amount =
          Number(payload.nightCount || 0) * Number(payload.allowancePerDay || 0)
      } else {
        const otTypeMap: Record<string, string> = {
          WEEKDAY: "OT_WEEKDAY",
          WEEKEND: "OT_WEEKEND",
          HOLIDAY: "OT_HOLIDAY",
          NIGHT_SHIFT: "NIGHT_SHIFT",
        }
        const otType = String(payload.otType || "WEEKDAY")
        itemType = otTypeMap[otType] || "OT_WEEKDAY"

        const baseSalary = Number(report.employee.contracts[0]?.baseSalary ?? 0)
        const hours = Number(payload.hours || 0)
        amount = calculateOTRate(baseSalary, 26, hours, otType as never)
      }

      if (amount > 0) {
        const item = await tx.payrollItem.create({
          data: {
            employeePayrollId: empPayroll.id,
            type: itemType as never,
            amount,
            description: `Từ báo cáo ${report.type}`,
            sourceId: report.id,
            sourceType: report.type === "OVERTIME" ? "REPORT_OT" : "REPORT_TRIP",
          },
        })
        payrollItemId = item.id
        payrollPeriodId = period.id
      }
    }
  }

  if (report.type.startsWith("LEAVE_") && report.leaveTypeId && report.leaveType?.isPaid) {
    const dayCount = Number(payload.dayCount || 0)
    if (dayCount > 0) {
      const leaveYear = report.startDate.getFullYear()
      const defaultDays = Number(report.leaveType.defaultDays || 0)
      await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: report.employeeId,
            leaveTypeId: report.leaveTypeId,
            year: leaveYear,
          },
        },
        create: {
          employeeId: report.employeeId,
          leaveTypeId: report.leaveTypeId,
          year: leaveYear,
          totalDays: defaultDays,
          usedDays: dayCount,
          remainingDays: Math.max(defaultDays - dayCount, 0),
        },
        update: {
          usedDays: { increment: dayCount },
          remainingDays: { decrement: dayCount },
        },
      })
    }
  }

  return { payrollItemId, payrollPeriodId }
}

export async function approveReport(params: {
  reportId: string
  level: ApprovalLevel
  approverUserId: string
  approverRole: string
}): Promise<{ report: ReportForApproval; becameFinal: boolean }> {
  return prisma.$transaction(async (tx) => {
    const report = await loadLockedReport(tx, params.reportId)

    if (APPROVAL_TERMINAL_STATUSES.has(report.status)) {
      throw new ReportApprovalError("Đơn từ không còn ở trạng thái chờ phê duyệt")
    }

    const approvingL1 = params.level === "L1"
    const alreadyApproved = approvingL1 ? !!report.l1ApprovedAt : !!report.l2ApprovedAt
    if (alreadyApproved) {
      throw new ReportApprovalError("Đơn từ đã được bạn phê duyệt trước đó")
    }

    const allowedStatuses = approvingL1
      ? new Set(["SUBMITTED", "APPROVED_L2"])
      : new Set(["SUBMITTED", "APPROVED_L1"])

    if (!allowedStatuses.has(report.status)) {
      throw new ReportApprovalError("Đơn từ không ở trạng thái chờ bạn phê duyệt")
    }

    const otherSideApproved = approvingL1 ? !!report.l2ApprovedAt : !!report.l1ApprovedAt
    const becameFinal = otherSideApproved

    let payrollItemId = report.payrollItemId
    let payrollPeriodId = report.payrollPeriodId

    if (becameFinal) {
      const artifacts = await createFinalApprovalArtifacts(
        tx,
        report,
        params.approverUserId
      )
      payrollItemId = artifacts.payrollItemId
      payrollPeriodId = artifacts.payrollPeriodId
    }

    const updated = await tx.report.update({
      where: { id: params.reportId },
      data: approvingL1
        ? {
            status: (becameFinal ? "APPROVED_FINAL" : "APPROVED_L1") as never,
            l1ApproverId: params.approverUserId,
            l1ApprovedAt: new Date(),
            returnReason: null,
            payrollItemId,
            payrollPeriodId,
          }
        : {
            status: (becameFinal ? "APPROVED_FINAL" : "APPROVED_L2") as never,
            l2ApproverId: params.approverUserId,
            l2ApprovedAt: new Date(),
            returnReason: null,
            payrollItemId,
            payrollPeriodId,
          },
      include: REPORT_APPROVAL_INCLUDE,
    })

    await tx.reportActivity.create({
      data: {
        reportId: params.reportId,
        actorId: params.approverUserId,
        actorRole: params.approverRole,
        action: approvingL1 ? "APPROVED_L1" : "APPROVED_L2",
      },
    })

    return {
      report: updated,
      becameFinal,
    }
  })
}
