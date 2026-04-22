import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { REPORT_TYPE_LABELS } from "@/lib/constants/labels"
import { emailService } from "@/lib/services/email.service"
import { notificationService } from "@/lib/services/notification.service"
import {
  approveReport,
  ReportApprovalError,
} from "@/lib/services/report-approval.service"

// POST /api/reports/[reportId]/approve-l1 — Manager approval, independent from L2
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { reportId } = await params

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          userId: true,
          teamManagerId: true,
        },
      },
    },
  })
  if (!report) {
    return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 })
  }
  if (!["SUBMITTED", "APPROVED_L2"].includes(report.status as string)) {
    return NextResponse.json({ error: "Đơn từ không ở trạng thái chờ phê duyệt" }, { status: 400 })
  }

  const userEmployee = await prisma.employee.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  })
  const isDirectManager = !!userEmployee && report.employee.teamManagerId === userEmployee.id
  const isSuperAdmin = session.user.role === "SUPER_ADMIN"
  if (!isDirectManager && !isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await approveReport({
      reportId,
      level: "L1",
      approverUserId: session.user.id,
      approverRole: session.user.role,
    })

    if (result.becameFinal) {
      try {
        if (result.report.employee.userId) {
          await notificationService.create({
            userId: result.report.employee.userId,
            type: "REPORT_APPROVED",
            title: "Đơn từ đã được phê duyệt",
            message: `Đơn từ ${REPORT_TYPE_LABELS[result.report.type] || result.report.type} đã được phê duyệt đủ 2 cấp`,
            link: `/reports/${reportId}`,
          })
        }
      } catch {
        // Non-blocking
      }

      try {
        await emailService.sendReportApproved({
          toEmails: [
            result.report.employee.companyEmail,
            result.report.employee.personalEmail,
            result.report.employee.user?.email,
          ].filter((email): email is string => !!email),
          employeeName: result.report.employee.fullName,
          employeeCode: result.report.employee.employeeCode,
          reportType: REPORT_TYPE_LABELS[result.report.type] || result.report.type,
          reportId,
          startDate: result.report.startDate,
          endDate: result.report.endDate,
          notes: result.report.notes,
        })
      } catch {
        // Non-blocking
      }

      if (result.report.payrollItemId) {
        try {
          await notificationService.notifyHR({
            type: "PAYROLL",
            title: "Đã thêm khoản vào bảng lương",
            message: `Báo cáo ${result.report.type} của ${result.report.employee.fullName} đã được thêm vào bảng lương`,
            link: result.report.payrollPeriodId
              ? `/payroll/${result.report.payrollPeriodId}`
              : undefined,
          })
        } catch {
          // Non-blocking
        }
      }
    }

    return NextResponse.json({ data: result.report })
  } catch (error) {
    if (error instanceof ReportApprovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}
