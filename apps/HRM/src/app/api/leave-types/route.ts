import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/leave-types
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leaveTypes = await prisma.leaveType.findMany({
      include: { policy: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(leaveTypes);
  } catch (error: any) {
    console.error("GET LEAVE TYPES ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/leave-types
export async function POST(request: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    !["SUPER_ADMIN", "HR_MANAGER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, code, defaultDays, isPaid, isActive, policy } = body;

    // Sử dụng transaction để đảm bảo toàn vẹn dữ liệu
    const result = await prisma.$transaction(async (tx) => {
      const lt = await tx.leaveType.create({
        data: {
          name,
          code,
          defaultDays: Number(defaultDays),
          isPaid: Boolean(isPaid),
          isActive: Boolean(isActive),
        },
      });

      await tx.leavePolicy.create({
        data: {
          leaveTypeId: lt.id,
          resetType: policy?.resetType || "ANNUAL",
          resetMonth: Number(policy?.resetMonth || 1),
          allowRollover: Boolean(policy?.allowRollover),
          maxRolloverDays: Number(policy?.maxRolloverDays || 0),
          rolloverExpiryMonth: Number(policy?.rolloverExpiryMonth || 3),
          autoAccrue: Boolean(policy?.autoAccrue),
          accrueAmount: Number(policy?.accrueAmount || 0),
        },
      });

      return await tx.leaveType.findUnique({
        where: { id: lt.id },
        include: { policy: true },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST LEAVE TYPE ERROR:", error);
    // Trả về lỗi chi tiết hơn để debug
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
