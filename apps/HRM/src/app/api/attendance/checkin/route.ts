import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getVNToday(): Date {
  // Get current date string in VN timezone (YYYY-MM-DD)
  const vnDateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  // Parse back to a date object at midnight UTC to keep it "clean" for Prisma @db.Date
  return new Date(vnDateStr);
}

function getVNNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
}

// GET /api/attendance/checkin — Today's record
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!employee) {
    return NextResponse.json({ data: null });
  }

  const today = getVNToday();

  const record = await prisma.attendanceRecord.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today,
      },
    },
  });

  return NextResponse.json({ data: record });
}

// POST /api/attendance/checkin — Check in or check out
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!employee) {
    return NextResponse.json(
      { error: "Không tìm thấy hồ sơ nhân viên" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { action, latitude, longitude } = body as {
    action: "checkin" | "checkout";
    latitude?: number;
    longitude?: number;
  };

  if (!action || !["checkin", "checkout"].includes(action)) {
    return NextResponse.json(
      { error: "Action phải là 'checkin' hoặc 'checkout'" },
      { status: 400 },
    );
  }

  const today = getVNToday();
  const now = new Date();
  const vnNow = getVNNow();

  // Get or find existing record
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today,
      },
    },
  });

  try {
    // Get logs array safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs = (existing?.logs as any[]) || [];
    const lastEvent = logs[logs.length - 1];

    if (action === "checkin") {
      if (lastEvent?.type === "in") {
        return NextResponse.json(
          { error: "Bạn đang ở trạng thái Check-in" },
          { status: 400 },
        );
      }

      // Determine status for the FIRST check-in of the day
      let status = existing?.status || "PRESENT";
      if (!existing) {
        const isLate =
          vnNow.getHours() > 8 ||
          (vnNow.getHours() === 8 && vnNow.getMinutes() > 30);
        status = isLate ? "LATE" : "PRESENT";
      }

      const newEvent = {
        type: "in",
        time: now.toISOString(),
        lat: latitude || null,
        lng: longitude || null,
      };

      const record = await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: { employeeId: employee.id, date: today },
        },
        create: {
          employeeId: employee.id,
          date: today,
          checkInAt: now,
          checkInLat: latitude || null,
          checkInLng: longitude || null,
          status,
          logs: [newEvent],
        },
        update: {
          logs: [...logs, newEvent],
          status,
        },
      });

      return NextResponse.json({ data: record });
    }

    // action === "checkout"
    if (!existing || lastEvent?.type !== "in") {
      return NextResponse.json(
        { error: "Bạn cần Check-in trước khi Check-out" },
        { status: 400 },
      );
    }

    // Calculate work hours for this session
    const lastInTime = new Date(lastEvent.time);
    const diffMs = now.getTime() - lastInTime.getTime();
    const sessionHours = diffMs / (1000 * 60 * 60);

    const totalWorkHours = Number(existing.workHours || 0) + sessionHours;

    const newEvent = {
      type: "out",
      time: now.toISOString(),
      lat: latitude || null,
      lng: longitude || null,
    };

    const record = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkOutAt: now,
        checkOutLat: latitude || null,
        checkOutLng: longitude || null,
        workHours: totalWorkHours,
        logs: [...logs, newEvent],
      },
    });

    return NextResponse.json({ data: record });
  } catch (err: any) {
    console.error("Attendance API Error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi Server nội bộ" },
      { status: 500 },
    );
  }
}
