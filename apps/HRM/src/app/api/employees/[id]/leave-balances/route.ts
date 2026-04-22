import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: any }) {
  const session = await auth();
  if (
    !session?.user ||
    !["SUPER_ADMIN", "HR_MANAGER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Thử cả 2 cách lấy ID để đảm bảo tương thích mọi phiên bản Next.js
    let id = "";
    if (params instanceof Promise) {
      const p = await params;
      id = p.id;
    } else {
      id = params.id;
    }

    console.log("DEBUG - Assigned employeeId:", id);

    if (!id) {
      return NextResponse.json(
        { error: "Missing employee ID" },
        { status: 400 },
      );
    }

    // Kiểm tra nhân viên có tồn tại hay không
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: `Employee not found with ID: ${id}` },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { leaveTypeConfigs } = body;

    const currentYear = new Date().getFullYear();

    const existingBalances = await prisma.leaveBalance.findMany({
      where: { employeeId: id, year: currentYear },
      select: { leaveTypeId: true, usedDays: true, totalDays: true },
    });

    const leaveTypeIds = leaveTypeConfigs.map((c: any) => c.id);

    // 2. Xử lý THÊM MỚI hoặc CẬP NHẬT
    for (const config of leaveTypeConfigs) {
      const existing = existingBalances.find(
        (b) => b.leaveTypeId === config.id,
      );
      const newTotal = Number(config.totalDays);

      if (!existing) {
        await prisma.leaveBalance.create({
          data: {
            employeeId: id,
            leaveTypeId: config.id,
            year: currentYear,
            totalDays: newTotal,
            remainingDays: newTotal,
            usedDays: 0,
          },
        });
      } else {
        if (Number(existing.totalDays) !== newTotal) {
          const newRemaining = newTotal - Number(existing.usedDays);
          await prisma.leaveBalance.update({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: id,
                leaveTypeId: config.id,
                year: currentYear,
              },
            },
            data: {
              totalDays: newTotal,
              remainingDays: newRemaining,
            },
          });
        }
      }
    }

    // 3. Thực hiện XÓA
    const existingTypeIds = existingBalances.map((b) => b.leaveTypeId);
    const toDelete = existingTypeIds.filter(
      (lid) => !leaveTypeIds.includes(lid),
    );

    for (const lid of toDelete) {
      const balance = existingBalances.find((b) => b.leaveTypeId === lid);
      if (balance && Number(balance.usedDays) === 0) {
        await prisma.leaveBalance.delete({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: id,
              leaveTypeId: lid,
              year: currentYear,
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LEAVE BALANCE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
