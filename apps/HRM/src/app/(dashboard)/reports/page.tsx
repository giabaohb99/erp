"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Palmtree,
  ClipboardCheck,
  LayoutList,
  CalendarRange,
  Clock,
  CheckCircle2,
  Info,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportCard, type ReportItem } from "@/components/reports/report-card";
import { REPORT_TYPE_LABELS } from "@/lib/constants/labels";
import { useState, useMemo } from "react";

const TYPE_OPTIONS = [
  { value: "ALL", label: "Tất cả loại đơn" },
  ...Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "SUBMITTED", label: "Đã nộp" },
  { value: "APPROVED_L1", label: "QL da duyet" },
  { value: "APPROVED_L2", label: "HR da duyet" },
  { value: "APPROVED_FINAL", label: "Đã duyệt" },
  { value: "RETURNED_L1", label: "QL tra lai" },
  { value: "RETURNED_L2", label: "HR tra lai" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export default function ReportsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isEmployee = role === "EMPLOYEE";

  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState("list");

  const params = new URLSearchParams();
  if (filterType !== "ALL") params.set("type", filterType);
  if (filterStatus !== "ALL") params.set("status", filterStatus);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const { data, isLoading } = useQuery({
    queryKey: ["reports", filterType, filterStatus],
    queryFn: async () => {
      const res = await fetch(`/api/reports${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Lấy dữ liệu quỹ phép thực tế cho chính người đang đăng nhập
  const { data: myBalances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["my-leave-detailed"],
    queryFn: async () => {
      const res = await fetch("/api/my-leave");
      return res.json();
    },
  });

  const reports: ReportItem[] = useMemo(() => data?.data || [], [data?.data]);
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleReports = useMemo(
    () => reports.slice(0, visibleCount),
    [reports, visibleCount],
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: "#1E3A5F" }}
          >
            Quản Lý Đơn Từ
          </h1>
          <p className="text-muted-foreground text-sm">
            Nơi gửi đơn và quản lý quỹ phép của cá nhân bạn
          </p>
        </div>
        <Button
          style={{ backgroundColor: "#1E3A5F" }}
          className="rounded-xl shadow-lg h-11 px-6 font-bold"
          onClick={() => router.push("/reports/new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tạo Đơn Mới
        </Button>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "list" ? "bg-white text-[#1E3A5F] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <LayoutList className="h-4 w-4" /> Đơn đã nộp
        </button>

        <button
          onClick={() => setActiveTab("my-balances")}
          className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "my-balances" ? "bg-white text-[#1E3A5F] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <CalendarRange className="h-4 w-4" /> Quỹ phép hiện có
        </button>
      </div>

      {activeTab === "list" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* QUICK SUMMARY CARDS */}
          {myBalances.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {myBalances.slice(0, 4).map((b: any) => (
                <div
                  key={b.id}
                  className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-emerald-200 transition-all cursor-pointer"
                  onClick={() => setActiveTab("my-balances")}
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {b.leaveType.code}
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      {b.leaveType.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">
                      {Number(b.remainingDays)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      còn lại
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FILTERS */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px] bg-white border-slate-200 rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] bg-white border-slate-200 rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterType !== "ALL" || filterStatus !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 font-bold hover:text-red-500 h-10"
                onClick={() => {
                  setFilterType("ALL");
                  setFilterStatus("ALL");
                }}
              >
                Xoá bộ lọc
              </Button>
            )}
          </div>

          {/* LIST */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-10 w-10 text-slate-200" />}
              title="Chưa có đơn nào"
              description="Bạn có thể tạo đơn nghỉ phép, tăng ca hoặc công tác ngay bây giờ."
            />
          ) : (
            <div className="space-y-3">
              {visibleReports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onClick={() => router.push(`/reports/${r.id}`)}
                  showEmployee={!isEmployee}
                />
              ))}
              {visibleCount < reports.length && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="rounded-xl font-bold border-slate-200"
                  >
                    Xem thêm ({reports.length - visibleCount} đơn)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "my-balances" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {loadingBalances ? (
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-[2rem]" />
            ))
          ) : myBalances.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
              Hệ thống chưa ghi nhận quỹ phép của bạn cho năm nay.
            </div>
          ) : (
            myBalances.map((balance: any) => {
              const usagePercent =
                (Number(balance.usedDays) / Number(balance.totalDays)) * 100;
              return (
                <Card
                  key={balance.id}
                  className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group hover:shadow-2xl transition-all"
                >
                  <CardHeader className="pb-2 space-y-0 bg-slate-900 text-white p-6">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <CalendarRange className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">
                          {Number(balance.remainingDays)}
                        </p>
                        <p className="text-[10px] uppercase font-bold text-emerald-400 leading-none">
                          ngày còn lại
                        </p>
                      </div>
                    </div>
                    <CardTitle className="pt-4 text-lg font-bold tracking-tight">
                      {balance.leaveType.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6 bg-white">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Đã dùng: {Number(balance.usedDays)}</span>
                        <span>Tổng định mức: {Number(balance.totalDays)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${usagePercent > 80 ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-50 rounded-2xl text-center">
                        <Clock className="h-4 w-4 text-slate-300 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Phân loại
                        </p>
                        <p className="text-xs font-bold text-slate-700">
                          {balance.leaveType.isPaid
                            ? "Trả lương"
                            : "Không lương"}
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-50/50 rounded-2xl text-center">
                        <CheckCircle2 className="h-4 w-4 text-indigo-300 mx-auto mb-1" />
                        <p className="text-[10px] font-bold text-indigo-400 uppercase">
                          Năm hưởng
                        </p>
                        <p className="text-xs font-bold text-indigo-700">
                          {balance.year}
                        </p>
                      </div>
                    </div>
                    {balance.leaveType.policy && (
                      <div className="p-3 bg-amber-50 rounded-xl flex items-start gap-2 border border-amber-100">
                        <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-800 leading-tight">
                          {balance.leaveType.policy.allowRollover
                            ? `Cho phép cộng dồn tối đa ${Number(balance.leaveType.policy.maxRolloverDays)} ngày sang năm sau.`
                            : "Quỹ phép sử dụng trong năm, không hỗ trợ cộng dồn."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
