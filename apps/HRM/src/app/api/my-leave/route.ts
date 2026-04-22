import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Tìm thông tin nhân viên từ UserId
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 },
      );
    }

    // 2. Lấy danh sách quỹ phép của nhân viên này
    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: employee.id,
        year: new Date().getFullYear(),
      },
      include: {
        leaveType: {
          include: {
            policy: true,
          },
        },
      },
      orderBy: {
        leaveType: {
          name: "asc",
        },
      },
    });

    return NextResponse.json(balances);
  } catch (error: any) {
    console.error("MY LEAVE API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
