import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (
    !session?.user ||
    !["SUPER_ADMIN", "HR_MANAGER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { employeeIds } = body; // Danh sách ID nhân viên muốn được cấp phép

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: params.id },
    });

    if (!leaveType) {
      return NextResponse.json(
        { error: "Leave type not found" },
        { status: 404 },
      );
    }

    const currentYear = new Date().getFullYear();

    // 1. Lấy danh sách hiện tại đang có trong DB
    const existingBalances = await prisma.leaveBalance.findMany({
      where: {
        leaveTypeId: params.id,
        year: currentYear,
      },
      select: { employeeId: true, usedDays: true },
    });

    const existingEmpIds = existingBalances.map((b) => b.employeeId);

    // 2. Những ai cần THÊM MỚI (Có trong list gửi lên nhưng chưa có trong DB)
    const toCreate = employeeIds.filter(
      (id: string) => !existingEmpIds.includes(id),
    );

    // 3. Những ai cần XÓA BỎ (Có trong DB nhưng không có trong list gửi lên)
    const toDelete = existingEmpIds.filter((id) => !employeeIds.includes(id));

    // Thực hiện Tạo mới
    for (const empId of toCreate) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: empId,
          leaveTypeId: params.id,
          year: currentYear,
          totalDays: leaveType.defaultDays,
          remainingDays: leaveType.defaultDays,
          usedDays: 0,
        },
      });
    }

    // Thực hiện Xóa (Chỉ xóa những ai chưa sử dụng ngày nào để đảm bảo an toàn dữ liệu)
    let deleteCount = 0;
    let skipCount = 0;
    for (const empId of toDelete) {
      const balance = existingBalances.find((b) => b.employeeId === empId);
      if (balance && Number(balance.usedDays) === 0) {
        await prisma.leaveBalance.delete({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: empId,
              leaveTypeId: params.id,
              year: currentYear,
            },
          },
        });
        deleteCount++;
      } else {
        skipCount++;
      }
    }

    return NextResponse.json({
      message: `Đã cập nhật xong: Thêm mới ${toCreate.length}, Xóa bỏ ${deleteCount}.${skipCount > 0 ? ` (Bỏ qua ${skipCount} người đã sử dụng phép)` : ""}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
