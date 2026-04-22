import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { REPORT_TYPE_LABELS } from "@/lib/constants/labels"
import { emailService } from "@/lib/services/email.service"
import { notificationService } from "@/lib/services/notification.service"

// POST /api/reports/[reportId]/return-l1 — Manager returns a pending report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { reportId } = await params
  const body = await request.json()
  const { reason } = body

  if (!reason) {
    return NextResponse.json({ error: "Lý do trả lại là bắt buộc" }, { status: 400 })
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      employee: {
        select: {
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

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "RETURNED_L1",
      returnReason: reason,
    },
  })

  await prisma.reportActivity.create({
    data: {
      reportId,
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "RETURNED_L1",
      comment: reason,
    },
  })

  // Notify employee
  try {
    if (report.employee.userId) {
      try {
        await notificationService.create({
          userId: report.employee.userId,
          type: "REPORT_RETURNED",
          title: "Đơn từ bị trả lại",
          message: `Đơn từ ${REPORT_TYPE_LABELS[report.type] || report.type} bị trả lại: ${reason}`,
          link: `/reports/${reportId}`,
        })
      } catch {
        // Non-blocking
      }
    }

    try {
      await emailService.sendReportReturned({
        toEmails: [
          report.employee.companyEmail,
          report.employee.personalEmail,
          report.employee.user?.email,
        ].filter((email): email is string => !!email),
        employeeName: report.employee.fullName,
        employeeCode: report.employee.employeeCode,
        reportType: REPORT_TYPE_LABELS[report.type] || report.type,
        reportId,
        startDate: report.startDate,
        endDate: report.endDate,
        notes: report.notes,
        reason,
        returnedLevel: "L1",
      })
    } catch {
      // Non-blocking
    }
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ data: updated })
}
