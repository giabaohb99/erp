import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  calculateBusinessNights,
  calculateOTHours,
  validateOTReport,
  calculateLeaveDays,
} from "@/lib/calculators/report"

// Simple in-memory rate limiter for POST
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10 // max 10 creates per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

// GET /api/reports — List reports with filters
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const status = searchParams.get("status")
  const employeeId = searchParams.get("employeeId")
  const pendingApproval = searchParams.get("pendingApproval")

  const role = session.user.role
  const canViewAllReports = ["SUPER_ADMIN", "HR_MANAGER", "HR_STAFF"].includes(role)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any>[] = []

  if (type) filters.push({ type })
  if (status) filters.push({ status })
  if (employeeId) filters.push({ employeeId })

  if (pendingApproval === "true") {
    // Approval queue filtering:
    // L1 and L2 can approve independently; a report stays pending for each side
    // until that side has approved it.
    const approvalFilters: Record<string, unknown>[] = []

    const userEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (userEmployee) {
      approvalFilters.push({
        status: { in: ["SUBMITTED", "APPROVED_L2"] },
        l1ApprovedAt: null,
        employee: { teamManagerId: userEmployee.id },
      })
    }

    if (["SUPER_ADMIN", "HR_MANAGER", "HR_STAFF"].includes(role)) {
      approvalFilters.push({
        status: { in: ["SUBMITTED", "APPROVED_L1"] },
        l2ApprovedAt: null,
      })
    }

    if (approvalFilters.length === 0) {
      return NextResponse.json({ data: [] })
    }
    filters.push({ OR: approvalFilters })
  } else if (!canViewAllReports) {
    // Employees see their own reports; non-HR manager roles also see direct reports.
    const userEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (userEmployee) {
      filters.push(
        role === "EMPLOYEE"
          ? { employeeId: userEmployee.id }
          : {
              OR: [
                { employeeId: userEmployee.id },
                { employee: { teamManagerId: userEmployee.id } },
              ],
            }
      )
    } else {
      return NextResponse.json({ data: [] })
    }
  }

  const where = filters.length > 0 ? { AND: filters } : {}

  const reports = await prisma.report.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ data: reports })
}

// POST /api/reports — Create new report
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    type,
    startDate,
    endDate,
    notes,
    payload: rawPayload,
    employeeId: bodyEmployeeId,
    leaveTypeId: bodyLeaveTypeId,
  } = body

  if (!type || !startDate || !endDate) {
    return NextResponse.json({ error: "Thiếu type, startDate hoặc endDate" }, { status: 400 })
  }

  // Rate limiting
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }, { status: 429 })
  }

  // Date validations
  const startD = new Date(startDate)
  const endD = new Date(endDate)
  if (endD < startD) {
    return NextResponse.json({ error: "Ngày kết thúc không được trước ngày bắt đầu" }, { status: 400 })
  }
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  if (startD < thirtyDaysAgo) {
    return NextResponse.json({ error: "Ngày bắt đầu không được quá 30 ngày trong quá khứ" }, { status: 400 })
  }

  // Determine employee
  let employeeId = bodyEmployeeId
  if (!employeeId || session.user.role === "EMPLOYEE") {
    const userEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!userEmployee) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ nhân viên" }, { status: 400 })
    }
    employeeId = userEmployee.id
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = rawPayload || {}
  let leaveTypeId: string | undefined

  // Type-specific processing
  if (type === "BUSINESS_TRIP") {
    payload.nightCount = calculateBusinessNights(start, end)
    payload.businessDays = payload.nightCount
  }

  if (type === "OVERTIME") {
    if (!payload.startTime || !payload.endTime || !payload.otType) {
      return NextResponse.json({ error: "Thiếu startTime, endTime hoặc otType cho tăng ca" }, { status: 400 })
    }
    const validation = validateOTReport(payload as { startTime: string; endTime: string; otType: "WEEKDAY" | "WEEKEND" | "HOLIDAY" | "NIGHT_SHIFT" })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join("; ") }, { status: 400 })
    }
    payload.hours = calculateOTHours(payload.startTime, payload.endTime)
  }

  if (type.startsWith("LEAVE_")) {
    const excludeWeekends = type === "LEAVE_PAID" || type === "LEAVE_WEDDING"
    payload.dayCount = calculateLeaveDays(start, end, excludeWeekends)
    const requestedLeaveTypeId =
      (typeof bodyLeaveTypeId === "string" && bodyLeaveTypeId) ||
      (typeof payload.leaveTypeId === "string" && payload.leaveTypeId)

    if (!requestedLeaveTypeId) {
      return NextResponse.json({ error: "Thieu leaveTypeId cho don nghi phep" }, { status: 400 })
    }

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: requestedLeaveTypeId },
      select: {
        id: true,
        isActive: true,
        isPaid: true,
        defaultDays: true,
      },
    })

    if (!leaveType || !leaveType.isActive) {
      return NextResponse.json({ error: "Loai nghi phep khong hop le hoac da bi tat" }, { status: 400 })
    }

    const expectsPaidLeaveType = type !== "LEAVE_UNPAID"
    if (leaveType.isPaid !== expectsPaidLeaveType) {
      return NextResponse.json({
        error: leaveType.isPaid
          ? "Don nghi khong luong khong duoc chon loai phep huong luong"
          : "Don nghi nay can chon loai phep huong luong",
      }, { status: 400 })
    }

    leaveTypeId = leaveType.id
    payload.leaveTypeId = leaveType.id

    // Check leave balance for LEAVE_PAID
    if (leaveType.isPaid) {
      const leaveYear = start.getFullYear()
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: leaveType.id,
            year: leaveYear,
          },
        },
      })
      const remaining = balance ? Number(balance.remainingDays) : Number(leaveType.defaultDays)
      if (payload.dayCount > remaining) {
        return NextResponse.json({
          error: `Không đủ số ngày phép (còn ${remaining} ngày, cần ${payload.dayCount} ngày)`,
        }, { status: 400 })
      }
    }
  }

  const report = await prisma.report.create({
    data: {
      employeeId,
      type,
      startDate: start,
      endDate: end,
      notes: notes || null,
      payload,
      leaveTypeId,
    },
    include: {
      employee: {
        select: { fullName: true, employeeCode: true },
      },
    },
  })

  return NextResponse.json({ data: report }, { status: 201 })
}
