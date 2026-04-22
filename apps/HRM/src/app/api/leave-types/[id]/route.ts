import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (
    !session?.user ||
    !["SUPER_ADMIN", "HR_MANAGER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code, defaultDays, isPaid, isActive, policy } = body;

    const result = await prisma.leaveType.update({
      where: { id },
      data: {
        name,
        code,
        defaultDays: Number(defaultDays),
        isPaid,
        isActive,
        policy: {
          upsert: {
            create: {
              resetType: policy?.resetType || "ANNUAL",
              resetMonth: Number(policy?.resetMonth || 1),
              allowRollover: policy?.allowRollover || false,
              maxRolloverDays: Number(policy?.maxRolloverDays || 0),
              rolloverExpiryMonth: Number(policy?.rolloverExpiryMonth || 3),
              autoAccrue: policy?.autoAccrue || false,
              accrueAmount: Number(policy?.accrueAmount || 0),
            },
            update: {
              resetType: policy?.resetType,
              resetMonth: Number(policy?.resetMonth),
              allowRollover: policy?.allowRollover,
              maxRolloverDays: Number(policy?.maxRolloverDays),
              rolloverExpiryMonth: Number(policy?.rolloverExpiryMonth),
              autoAccrue: policy?.autoAccrue,
              accrueAmount: Number(policy?.accrueAmount),
            },
          },
        },
      },
      include: { policy: true },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (
    !session?.user ||
    !["SUPER_ADMIN", "HR_MANAGER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Kiểm tra xem có đang được sử dụng không
    const count = await prisma.leaveBalance.count({
      where: { leaveTypeId: id },
    });
    if (count > 0) {
      return NextResponse.json(
        {
          error: "Không thể xóa loại phép này vì đã có nhân viên đang sử dụng.",
        },
        { status: 400 },
      );
    }

    await prisma.leaveType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
