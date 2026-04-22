import { REPORT_TYPE_LABELS } from "@/lib/constants/labels"
import { prisma } from "@/lib/prisma"
import { emailService } from "@/lib/services/email.service"
import { notificationService } from "@/lib/services/notification.service"

type SubmissionReport = {
  id: string
  type: string
  startDate: Date
  endDate: Date
  notes: string | null
  employee: {
    employeeCode: string
    fullName: string
    userId?: string | null
    companyEmail?: string | null
    personalEmail?: string | null
    user?: { email?: string | null } | null
    teamManager?: {
      fullName?: string | null
      userId?: string | null
      companyEmail?: string | null
      personalEmail?: string | null
      user?: { email?: string | null } | null
    } | null
  }
}

async function getL2Approvers() {
  return prisma.user.findMany({
    where: {
      role: { in: ["SUPER_ADMIN", "HR_MANAGER", "HR_STAFF"] },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      employee: {
        select: {
          companyEmail: true,
          personalEmail: true,
        },
      },
    },
  })
}

export async function notifyReportSubmitted(params: {
  report: SubmissionReport
  isResubmission?: boolean
}) {
  const { report, isResubmission = false } = params
  const reportLabel = REPORT_TYPE_LABELS[report.type] || report.type
  const actionLabel = isResubmission ? "nộp lại" : "nộp"
  const employeeLink = `/reports/${report.id}`

  const manager = report.employee.teamManager
  const l2Approvers = await getL2Approvers()

  const managerUserId = manager?.userId || null
  const filteredL2Approvers = managerUserId
    ? l2Approvers.filter((approver) => approver.id !== managerUserId)
    : l2Approvers
  const hrUserIds = filteredL2Approvers.map((approver) => approver.id)

  const jobs: Promise<unknown>[] = []

  if (managerUserId) {
    jobs.push(
      notificationService.create({
        userId: managerUserId,
        type: "REPORT_SUBMITTED",
        title: "Đơn từ cần duyệt",
        message: `${report.employee.fullName} đã ${actionLabel} đơn ${reportLabel}`,
        link: employeeLink,
      })
    )
  }

  if (hrUserIds.length > 0) {
    jobs.push(
      notificationService.createForMany({
        userIds: hrUserIds,
        type: "REPORT_SUBMITTED",
        title: "Đơn từ cần duyệt",
        message: `${report.employee.fullName} đã ${actionLabel} đơn ${reportLabel}`,
        link: employeeLink,
      })
    )
  }

  if (report.employee.userId) {
    jobs.push(
      notificationService.create({
        userId: report.employee.userId,
        type: "REPORT_SUBMITTED",
        title: isResubmission ? "Bạn đã nộp lại đơn" : "Bạn đã nộp đơn",
        message: `${reportLabel} đã được gửi đến Quản lý và HR để xử lý`,
        link: employeeLink,
      })
    )
  }

  jobs.push(
    emailService.sendReportPendingApproval({
      toEmails: [
        manager?.companyEmail,
        manager?.personalEmail,
        manager?.user?.email,
      ].filter((email): email is string => !!email),
      recipientName: manager?.fullName || "Quản lý trực tiếp",
      employeeName: report.employee.fullName,
      employeeCode: report.employee.employeeCode,
      reportType: reportLabel,
      reportId: report.id,
      startDate: report.startDate,
      endDate: report.endDate,
      notes: report.notes,
      approvalLevel: "L1",
    })
  )

  jobs.push(
    emailService.sendReportPendingApproval({
      toEmails: filteredL2Approvers.flatMap((approver) =>
        [
          approver.employee?.companyEmail,
          approver.employee?.personalEmail,
          approver.email,
        ].filter((email): email is string => !!email)
      ),
      recipientName: "HR",
      employeeName: report.employee.fullName,
      employeeCode: report.employee.employeeCode,
      reportType: reportLabel,
      reportId: report.id,
      startDate: report.startDate,
      endDate: report.endDate,
      notes: report.notes,
      approvalLevel: "L2",
    })
  )

  jobs.push(
    emailService.sendReportSubmittedConfirmation({
      toEmails: [
        report.employee.companyEmail,
        report.employee.personalEmail,
        report.employee.user?.email,
      ].filter((email): email is string => !!email),
      employeeName: report.employee.fullName,
      employeeCode: report.employee.employeeCode,
      reportType: reportLabel,
      reportId: report.id,
      startDate: report.startDate,
      endDate: report.endDate,
      notes: report.notes,
      isResubmission,
    })
  )

  await Promise.allSettled(jobs)
}
