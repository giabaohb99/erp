"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  PartyPopper,
  AlertCircle,
  HelpCircle,
  Edit2,
  Download,
} from "lucide-react";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants/labels";

const STATUS_ICONS: Record<string, React.ElementType> = {
  PRESENT: CheckCircle2,
  LATE: Clock,
  HALF_DAY: Clock,
  ABSENT: XCircle,
  LEAVE: Calendar,
  HOLIDAY: PartyPopper,
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "text-emerald-500",
  LATE: "text-amber-500",
  HALF_DAY: "text-blue-500",
  ABSENT: "text-red-500",
  LEAVE: "text-indigo-500",
  HOLIDAY: "text-pink-500",
};

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  workHours: number | string | null;
  isManualEdit: boolean;
  logs?: any[];
}

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const weekday = d.toLocaleDateString("vi-VN", { weekday: "long" });
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${weekday}`;
}

function fmtHours(h: number | string | null): string {
  if (h == null) return "";
  const n = Number(h);
  const hrs = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  return `${hrs}h ${mins}p`;
}

export function MyAttendance() {
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));

  const { data, isLoading } = useQuery({
    queryKey: ["my-attendance", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/me?month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const records: AttendanceRecord[] = data?.data || [];
  const summary = data?.summary;

  const handleExportCSV = () => {
    if (!records.length) return;

    // CSV Header
    const headers = ["Ngay", "Trang Thai", "Lich Su Vao/Ra", "Tong Gio Lam"];
    const rows = records.map((r) => {
      const logs = r.logs || [];
      const logStr = logs
        .map((l: any) => `${l.type === "in" ? "Vao" : "Ra"} ${fmtTime(l.time)}`)
        .join(" | ");
      return [
        fmtDate(r.date.split("T")[0]),
        ATTENDANCE_STATUS_LABELS[r.status] || r.status,
        logStr,
        fmtHours(r.workHours),
      ];
    });

    const csvContent =
      "\uFEFF" + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cham_Cong_Thang_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#1E3A5F" }}>
          Chấm Công Của Tôi
        </h1>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  Tháng {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={handleExportCSV}
            disabled={records.length === 0}
          >
            <Download className="h-4 w-4" />
            Kiểm Công
          </Button>
        </div>
      </div>

      {summary && (
        <div className="flex gap-4 text-xs font-medium bg-white p-3 rounded-lg border shadow-sm flex-wrap items-center">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
            <CheckCircle2 className="h-3.5 w-3.5" /> {summary.present} ĐÚNG GIỜ
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-md">
            <Clock className="h-3.5 w-3.5" /> {summary.late} TRỄ
          </div>
          {summary.halfDay > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
              <Clock className="h-3.5 w-3.5" /> {summary.halfDay} NỬA NGÀY
            </div>
          )}
          {summary.absent > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded-md">
              <XCircle className="h-3.5 w-3.5" /> {summary.absent} VẮNG
            </div>
          )}
          {summary.leave > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">
              <Calendar className="h-3.5 w-3.5" /> {summary.leave} PHÉP
            </div>
          )}
          <div className="ml-auto text-sm" style={{ color: "#1E3A5F" }}>
            Ngày công: <span className="font-bold">{summary.actualDays}</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground italic">
          Đang tải dữ liệu...
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Chưa có dữ liệu chấm công tháng {month}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="py-3 border-b bg-slate-50/50">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              Chi tiết tháng {month}/{year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {records.map((r) => (
                <AttendanceRow key={r.id} r={r} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AttendanceRow({ r }: { r: AttendanceRecord }) {
  const [open, setOpen] = useState(false);
  const dateStr = typeof r.date === "string" ? r.date.split("T")[0] : r.date;
  const Icon = STATUS_ICONS[r.status] || HelpCircle;
  const colorClass = STATUS_COLORS[r.status] || "text-slate-400";
  const logs = r.logs || [];

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {fmtDate(dateStr)}
          </p>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-0.5">
              <span className="font-bold text-slate-400">IN:</span>{" "}
              {fmtTime(r.checkInAt)}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-0.5">
              <span className="font-bold text-slate-400">OUT:</span>{" "}
              {fmtTime(r.checkOutAt)}
            </span>
            {r.workHours != null && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                  Tổng: {fmtHours(r.workHours)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[10px] uppercase font-bold shrink-0 border-current/20 ${colorClass} bg-current/5`}
          >
            {ATTENDANCE_STATUS_LABELS[r.status] || r.status}
          </Badge>
          {r.isManualEdit && (
            <Edit2
              className="h-3 w-3 text-amber-500 opacity-70"
              title="Đã sửa bởi HR"
            />
          )}
        </div>
      </div>

      {open && logs.length > 0 && (
        <div className="px-12 pb-4 pt-1 space-y-2 bg-slate-50/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Chi tiết trong ngày:
          </p>
          <div className="relative space-y-3 pl-3 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-200">
            {logs.map((log: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${log.type === "in" ? "bg-emerald-500" : "bg-red-400"}`}
                  />
                  <span className="font-medium text-slate-600">
                    {log.type === "in" ? "Vào ca" : "Ra ca"}
                  </span>
                </div>
                <span className="text-slate-500 font-mono italic">
                  {fmtTime(log.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
