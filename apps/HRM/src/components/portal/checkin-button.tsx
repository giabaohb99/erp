"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, MapPinOff } from "lucide-react";
import { useGeolocation } from "@/lib/hooks/use-geolocation";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  workHours: number | string | null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function fmtHours(h: number | string | null): string {
  if (h == null) return "";
  const n = Number(h);
  const hrs = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  return `${hrs}h ${mins}p`;
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Đúng giờ",
  LATE: "Đi trễ",
  HALF_DAY: "Nửa ngày",
};

export function CheckinButton() {
  const queryClient = useQueryClient();
  const {
    latitude,
    longitude,
    loading: gpsLoading,
    error: gpsError,
    requestPosition,
  } = useGeolocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["today-checkin"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/checkin");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const record: (AttendanceRecord & { logs?: any[] }) | null =
    data?.data || null;
  const logs = record?.logs || [];
  const lastEvent = logs[logs.length - 1];

  // Decision logic for button state
  const isCurrentlyIn = lastEvent?.type === "in";
  const hasCheckedInAtLeastOnce = logs.some((l) => l.type === "in");

  async function handleCheckin(action: "checkin" | "checkout") {
    setError("");
    setSubmitting(true);

    try {
      // Get GPS position
      const coords = await requestPosition();

      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Lỗi chấm công");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["today-checkin"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối Server");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Đang tải...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today status card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground font-medium">
              Trạng thái ngày hiện tại
            </p>
            {record?.status && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  record.status === "LATE"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}
              >
                {STATUS_LABELS[record.status] || record.status}
              </span>
            )}
          </div>
          {!hasCheckedInAtLeastOnce || !record ? (
            <p className="text-base font-medium">Chưa chấm công</p>
          ) : (
            <div className="space-y-3">
              {/* Event Timeline */}
              <div className="space-y-2 border-l-2 border-slate-100 ml-1 pl-4">
                {logs.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full -ml-[21px] ${log.type === "in" ? "bg-emerald-500" : "bg-red-400"}`}
                      />
                      <span className="font-semibold text-slate-600">
                        {log.type === "in" ? "Vào" : "Ra"}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono">
                      {fmtTime(log.time)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Tổng giờ làm:
                </span>
                <strong className="text-base text-emerald-600">
                  {fmtHours(record.workHours)}
                </strong>
              </div>

              {isCurrentlyIn && (
                <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] flex items-center gap-1.5 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Đang trong ca làm việc...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in/out button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => handleCheckin(isCurrentlyIn ? "checkout" : "checkin")}
          disabled={submitting || gpsLoading}
          className={`w-36 h-36 rounded-full text-white text-lg font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
            isCurrentlyIn
              ? "bg-red-500 hover:bg-red-600"
              : "bg-emerald-500 hover:bg-emerald-600"
          }`}
        >
          {submitting || gpsLoading
            ? "..."
            : isCurrentlyIn
              ? "CHECK OUT"
              : "CHECK IN"}
        </button>

        {/* GPS indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {gpsError ? (
            <>
              <MapPinOff className="h-3.5 w-3.5 text-red-500" />
              <span className="text-red-500">{gpsError}</span>
            </>
          ) : latitude != null && longitude != null ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-600">GPS sẵn sàng</span>
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                GPS sẽ được lấy khi chấm công
              </span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded text-center">
          {error}
        </div>
      )}
    </div>
  );
}
