"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Sparkles, FileText, Clock, UserCircle } from "lucide-react";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { DeptChart } from "@/components/dashboard/dept-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { ExpiryAlerts } from "@/components/dashboard/expiry-alerts";
import { PendingList } from "@/components/dashboard/pending-list";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const userRole = session?.user?.role;
  const isAdmin = ["SUPER_ADMIN", "HR_MANAGER", "HR_STAFF"].includes(
    userRole as string,
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 60000,
    enabled: status === "authenticated" && isAdmin,
  });

  if (status === "authenticated" && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-xl shadow-sm border">
        <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Chào mừng, {session?.user?.name}!
        </h1>
        <p className="text-slate-500 mb-8 max-w-md">
          Bạn đang ở trang cá nhân của hệ thống POD HRM. Hãy chọn các tính năng
          bên dưới hoặc sử dụng thanh điều hướng bên trái để bắt đầu.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          <Link
            href="/reports"
            className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
          >
            <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Đơn Nghỉ Phép</div>
              <div className="text-xs text-slate-500 text-balance">
                Tạo mới và theo dõi trạng thái đơn từ.
              </div>
            </div>
          </Link>

          <Link
            href="/attendance"
            className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
          >
            <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Chấm Công</div>
              <div className="text-xs text-slate-500">
                Xem bảng công và lịch sử đi làm.
              </div>
            </div>
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
          >
            <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-100">
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">
                Thông Tin Hồ Sơ
              </div>
              <div className="text-xs text-slate-500">
                Xem hợp đồng, lương và hồ sơ cá nhân.
              </div>
            </div>
          </Link>

          <Link
            href="/copilot"
            className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
          >
            <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-100">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">HR Copilot</div>
              <div className="text-xs text-slate-500">
                Hỏi đáp chính sách công ty bằng AI.
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  const metrics = data || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#1E3A5F" }}>
          Tổng Quan
        </h1>
        <span className="text-sm text-muted-foreground">
          Tháng {format(new Date(), "MM/yyyy", { locale: vi })}
        </span>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          Không thể tải dữ liệu tổng quan. Vui lòng thử lại sau.
        </div>
      )}

      <StatsGrid
        totalActive={metrics.totalActive ?? 0}
        totalProbation={metrics.totalProbation ?? 0}
        expiring7={metrics.expiring7 ?? 0}
        openReqs={metrics.openReqs ?? 0}
        pendingApps={metrics.pendingApps ?? 0}
        pendingL1={metrics.pendingL1 ?? 0}
        pendingL2={metrics.pendingL2 ?? 0}
        currentPayroll={
          metrics.currentPayroll ?? {
            status: "NONE",
            totalNet: 0,
            employeeCount: 0,
          }
        }
        activeOnboarding={metrics.activeOnboarding ?? 0}
        loading={isLoading}
        activeEmployeesList={metrics.activeEmployeesList}
        probationEmployeesList={metrics.probationEmployeesList}
        expiringContracts={metrics.expiringContracts}
        openReqsList={metrics.openReqsList}
        pendingReports={metrics.pendingReports}
        onboardingList={metrics.onboardingList}
      />

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <DeptChart data={metrics.byDepartment ?? []} />
        <TrendChart data={metrics.headcountTrend ?? []} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <ExpiryAlerts contracts={metrics.expiringContracts ?? []} />
        <PendingList reports={metrics.pendingReports ?? []} />
      </div>
    </div>
  );
}
