"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  PartyPopper,
  AlertCircle,
  HelpCircle,
  Search,
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
import { useToast } from "@/hooks/use-toast";
import { AttendanceImportDialog } from "@/components/attendance/attendance-import";
import { AttendanceAIPanel } from "@/components/attendance/attendance-ai-panel";
import { TableSkeleton } from "@/components/ui/loading-state";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  workHours: number | string | null;
  isManualEdit: boolean;
  editNote: string | null;
  logs?: any[];
}

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  department: { name: string } | null;
}

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function fmtHours(h: number | string | null): string {
  if (h == null) return "";
  const n = Number(h);
  const hrs = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  return `${hrs}h ${mins}p`;
}

export function AttendanceGrid() {
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-grid", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const employees: Employee[] = data?.employees || [];
  const recordMap = data?.recordMap || {};
  const workingDays: string[] = data?.workingDays || [];

  const handleExportCSV = () => {
    if (!employees.length || !workingDays.length) return;

    // CSV Header: Info + each day
    const headers = [
      "Ma NV",
      "Ho Ten",
      "Phong Ban",
      "Tong Cong",
      "Tong Gio",
      ...workingDays,
    ];

    const rows = employees.map((emp) => {
      const empRecords = recordMap[emp.id] || {};

      // Calculate totals for summary
      let totalHours = 0;
      let totalDays = 0;

      const dayData = workingDays.map((date) => {
        const r = empRecords[date];
        if (!r) return "-";
        totalDays +=
          r.status === "PRESENT" || r.status === "LATE"
            ? 1
            : r.status === "HALF_DAY"
              ? 0.5
              : 0;
        totalHours += Number(r.workHours || 0);

        // Show hours and detailed logs
        const logs = r.logs || [];
        const logStr = logs
          .map((l: any) => `${l.type === "in" ? "V" : "R"} ${fmtTime(l.time)}`)
          .join(" ");
        return `${fmtHours(r.workHours)} [${logStr}]`;
      });

      return [
        emp.employeeCode,
        emp.fullName,
        emp.department?.name || "-",
        totalDays,
        totalHours.toFixed(2),
        ...dayData,
      ];
    });

    const csvContent =
      "\uFEFF" + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Bao_Cao_Cham_Cong_Tong_Hop_Thang_${month}_${year}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/sync-payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: Number(month), year: Number(year) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: "Sync thành công", description: result.message });
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editRecord) return;
      const body: Record<string, string> = { editNote };
      if (editCheckIn)
        body.checkInAt = new Date(
          `${editRecord.date.split("T")[0]}T${editCheckIn}:00`,
        ).toISOString();
      if (editCheckOut)
        body.checkOutAt = new Date(
          `${editRecord.date.split("T")[0]}T${editCheckOut}:00`,
        ).toISOString();

      const res = await fetch(`/api/attendance/${editRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-grid"] });
      setEditRecord(null);
      toast({ title: "Đã cập nhật chấm công" });
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: err.message, variant: "destructive" }),
  });

  // Summary stats
  let totalPresent = 0,
    totalLate = 0,
    totalAbsent = 0;
  for (const empId of Object.keys(recordMap)) {
    for (const rec of Object.values(recordMap[empId])) {
      if (rec.status === "PRESENT") totalPresent++;
      else if (rec.status === "LATE") totalLate++;
      else if (rec.status === "ABSENT") totalAbsent++;
    }
  }

  function openEdit(record: AttendanceRecord) {
    setEditRecord(record);
    setEditNote(record.editNote || "");
    setEditCheckIn(
      record.checkInAt
        ? new Date(record.checkInAt).toTimeString().slice(0, 5)
        : "",
    );
    setEditCheckOut(
      record.checkOutAt
        ? new Date(record.checkOutAt).toTimeString().slice(0, 5)
        : "",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold" style={{ color: "#1E3A5F" }}>
          Chấm Công
        </h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            style={{ backgroundColor: "#1E3A5F" }}
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Chấm Công
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            {syncMutation.isPending ? "Đang sync..." : "Sync vào Bảng Lương"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={handleExportCSV}
            disabled={employees.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất Báo Cáo
          </Button>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[130px]">
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
        </div>
      </div>

      <div className="flex gap-4 text-xs font-semibold flex-wrap">
        <div className="text-slate-500">{employees.length} NV</div>
        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
          <CheckCircle2 className="h-3 w-3" /> Đúng giờ: {totalPresent}
        </div>
        <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
          <Clock className="h-3 w-3" /> Trễ: {totalLate}
        </div>
        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
          <XCircle className="h-3 w-3" /> Vắng: {totalAbsent}
        </div>
      </div>

      <div className="text-[10px] uppercase font-bold text-muted-foreground flex gap-4 flex-wrap">
        {Object.entries(STATUS_ICONS).map(([k, Icon]) => (
          <div key={k} className="flex items-center gap-1">
            <Icon
              className={`h-3 w-3 ${STATUS_COLORS[k] || "text-slate-400"}`}
            />
            <span>{ATTENDANCE_STATUS_LABELS[k]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm border bg-slate-50" />
          <span>Chưa có</span>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Bảng Chấm Công — Tháng {month}/{year} ({workingDays.length} ngày
              làm)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className="overflow-x-auto max-h-[70vh] overflow-y-auto"
              style={{ contain: "layout" }}
            >
              <table className="text-xs w-full">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-2 sticky left-0 bg-white z-30 min-w-[140px]">
                      Nhân Viên
                    </th>
                    {workingDays.map((d) => (
                      <th
                        key={d}
                        className="text-center py-2 px-1 min-w-[32px]"
                      >
                        {new Date(d + "T00:00:00").getDate()}
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 min-w-[70px]">
                      Tổng Công
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const empRecords = recordMap[emp.id] || {};
                    let actualDays = 0;
                    for (const rec of Object.values(empRecords)) {
                      const s = rec.status;
                      if (
                        s === "PRESENT" ||
                        s === "LATE" ||
                        s === "LEAVE" ||
                        s === "HOLIDAY"
                      )
                        actualDays += 1;
                      else if (s === "HALF_DAY") actualDays += 0.5;
                    }

                    return (
                      <tr key={emp.id} className="border-b hover:bg-muted/30">
                        <td className="py-1.5 px-2 sticky left-0 bg-white z-10">
                          <div className="font-medium truncate">
                            {emp.fullName}
                          </div>
                          <div className="text-muted-foreground">
                            {emp.employeeCode}
                          </div>
                        </td>
                        {workingDays.map((d) => {
                          const rec = empRecords[d];
                          if (!rec)
                            return (
                              <td
                                key={d}
                                className="text-center py-1.5 px-1 opacity-20"
                              >
                                <div className="h-4 w-4 mx-auto rounded-sm bg-slate-200" />
                              </td>
                            );

                          const Icon = STATUS_ICONS[rec.status] || HelpCircle;
                          const colorClass =
                            STATUS_COLORS[rec.status] || "text-slate-400";

                          return (
                            <td
                              key={d}
                              className="text-center py-1.5 px-1 cursor-pointer hover:bg-blue-50 transition-colors"
                              title={`${ATTENDANCE_STATUS_LABELS[rec.status]} — ${fmtTime(rec.checkInAt)}→${fmtTime(rec.checkOutAt)}`}
                              onClick={() => openEdit(rec)}
                            >
                              <Icon
                                className={`h-4 w-4 mx-auto ${colorClass}`}
                              />
                            </td>
                          );
                        })}
                        <td className="text-center py-1.5 px-2 font-medium">
                          {actualDays}/{workingDays.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Intelligence Panel */}
      <AttendanceAIPanel month={Number(month)} year={Number(year)} />

      {/* Import Dialog */}
      <AttendanceImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Edit Dialog */}
      <Dialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa Chấm Công</DialogTitle>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ngày: {editRecord.date.split("T")[0]} — Trạng thái:{" "}
                {ATTENDANCE_STATUS_LABELS[editRecord.status] ||
                  editRecord.status}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Check-in</Label>
                  <Input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Check-out</Label>
                  <Input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                  />
                </div>
              </div>
              {editRecord.logs && editRecord.logs.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
                    Lịch sử bấm nút thực tế
                  </p>
                  <div className="space-y-1.5">
                    {editRecord.logs.map((log: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span
                          className={`font-semibold ${log.type === "in" ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {log.type === "in" ? "→ VÀO" : "← RA"}
                        </span>
                        <span className="font-mono text-slate-500">
                          {new Date(log.time).toLocaleTimeString("vi-VN")}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center bg-white/50 px-1 -mx-1 rounded-b">
                    <span className="text-[10px] font-bold text-slate-500">
                      TỔNG GIỜ LÀM:
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">
                      {fmtHours(editRecord.workHours)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label>Ghi chú sửa (bắt buộc)</Label>
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="VD: NV quên check-out"
                />
              </div>
              <Button
                className="w-full"
                style={{ backgroundColor: "#1E3A5F" }}
                disabled={!editNote || editMutation.isPending}
                onClick={() => editMutation.mutate()}
              >
                {editMutation.isPending ? "Đang lưu..." : "Lưu Thay Đổi"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
