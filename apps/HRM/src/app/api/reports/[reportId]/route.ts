import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/reports/[reportId] — Report detail
export async function GET(
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
          id: true, fullName: true, employeeCode: true, userId: true,
          department: { select: { id: true, name: true } },
          position: { select: { name: true } },
          teamManager: { select: { id: true, userId: true, fullName: true } },
        },
      },
      activities: {
        include: {
          actor: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      payrollItem: { select: { id: true, type: true, amount: true } },
    },
  })

  if (!report) {
    return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 })
  }

  const canViewAllReports = ["SUPER_ADMIN", "HR_MANAGER", "HR_STAFF"].includes(session.user.role)

  // Non-HR users can see their own reports and reports from direct reports.
  if (!canViewAllReports) {
    const userEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    })
    const isOwner = report.employeeId === userEmployee?.id
    const isDirectManager = report.employee.teamManager?.id === userEmployee?.id
    if (!isOwner && !isDirectManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return NextResponse.json({ data: report })
}

// PUT /api/reports/[reportId] — Update (only DRAFT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { reportId } = await params

  const report = await prisma.report.findUnique({
    where: { id: reportId },
  })
  if (!report) {
    return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 })
  }
  if (report.status !== "DRAFT" && report.status !== "RETURNED_L1" && report.status !== "RETURNED_L2") {
    return NextResponse.json({ error: "Chỉ có thể chỉnh sửa báo cáo ở trạng thái Nháp hoặc Trả lại" }, { status: 400 })
  }

  const body = await request.json()
  const { startDate, endDate, notes, payload } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}
  if (startDate) updateData.startDate = new Date(startDate)
  if (endDate) updateData.endDate = new Date(endDate)
  if (notes !== undefined) updateData.notes = notes
  if (payload) updateData.payload = payload

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: updateData,
  })

  return NextResponse.json({ data: updated })
}
