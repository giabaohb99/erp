import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyReportSubmitted } from "@/lib/services/report-notification.service"

// POST /api/reports/[reportId]/resubmit — RETURNED_* → SUBMITTED
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
          userId: true,
          employeeCode: true,
          fullName: true,
          companyEmail: true,
          personalEmail: true,
          user: { select: { email: true } },
          teamManager: {
            select: {
              fullName: true,
              userId: true,
              companyEmail: true,
              personalEmail: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
  })
  if (!report) {
    return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 })
  }
  if (report.status !== "RETURNED_L1" && report.status !== "RETURNED_L2") {
    return NextResponse.json({ error: "Chỉ có thể nộp lại báo cáo đã bị trả" }, { status: 400 })
  }

  if (!report.employee.teamManager?.userId) {
    return NextResponse.json({
      error: "Nhân viên chưa có quản lý trực tiếp hoặc quản lý chưa có tài khoản đăng nhập",
    }, { status: 400 })
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      returnReason: null,
      l1ApproverId: null,
      l1ApprovedAt: null,
      l2ApproverId: null,
      l2ApprovedAt: null,
    },
  })

  await prisma.reportActivity.create({
    data: {
      reportId,
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "RESUBMITTED",
    },
  })

  try {
    await notifyReportSubmitted({
      report: {
        ...report,
        id: reportId,
      },
      isResubmission: true,
    })
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ data: updated })
}
