"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Settings2,
  Loader2,
  CheckCircle2,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaveBalance {
  id: string;
  year: number;
  totalDays: any;
  usedDays: any;
  remainingDays: any;
  leaveType: {
    id: string;
    name: string;
    code: string;
    isPaid: boolean;
  };
}

interface LeaveBalanceTabProps {
  employeeId: string;
  balances: LeaveBalance[];
}

interface SelectionConfig {
  id: string;
  totalDays: number;
}

export function LeaveBalanceTab({
  employeeId,
  balances,
}: LeaveBalanceTabProps) {
  const [open, setOpen] = useState(false);
  const [configs, setConfigs] = useState<SelectionConfig[]>([]);
  const [tableData, setTableData] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  // Khởi tạo tableData từ balances ban đầu
  useEffect(() => {
    const initialData: Record<string, number> = {};
    balances.forEach((b) => {
      initialData[b.id] = Number(b.totalDays);
    });
    setTableData(initialData);
    setHasChanges(false);
  }, [balances]);

  const { data: allLeaveTypes = [], isLoading: ltLoading } = useQuery<any[]>({
    queryKey: ["leave-types-active"],
    queryFn: async () => {
      const res = await fetch("/api/leave-types");
      const data = await res.json();
      return data.filter((lt: any) => lt.isActive);
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (payload: SelectionConfig[]) => {
      const res = await fetch(`/api/employees/${employeeId}/leave-balances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveTypeConfigs: payload }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      setOpen(false);
      setHasChanges(false);
      toast({ title: "Đã cập nhật thành công" });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật quỹ phép",
        variant: "destructive",
      });
    },
  });

  const handleOpenConfig = () => {
    const currentConfigs = balances
      .filter((b) => b.year === currentYear)
      .map((b) => ({
        id: b.leaveType.id,
        totalDays: tableData[b.id] || Number(b.totalDays),
      }));
    setConfigs(currentConfigs);
    setOpen(true);
  };

  const handleTableEdit = (balanceId: string, value: string) => {
    const newVal = Number(value);
    setTableData((prev) => ({ ...prev, [balanceId]: newVal }));
    setHasChanges(true);
  };

  const saveTableChanges = () => {
    // Chuyển đổi tableData về định dạng API yêu cầu
    const payload = balances.map((b) => ({
      id: b.leaveType.id,
      totalDays: tableData[b.id] ?? Number(b.totalDays),
    }));
    mutation.mutate(payload);
  };

  const isSelected = (id: string) => configs.some((c) => c.id === id);

  const toggleSelect = (type: any) => {
    if (isSelected(type.id)) {
      setConfigs((prev) => prev.filter((c) => c.id !== type.id));
    } else {
      setConfigs((prev) => [
        ...prev,
        { id: type.id, totalDays: type.defaultDays },
      ]);
    }
  };

  const updateModalDays = (id: string, days: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, totalDays: Number(days) } : c)),
    );
  };

  const years = Array.from(new Set(balances.map((b) => b.year))).sort(
    (a, b) => b - a,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 animate-in fade-in zoom-in duration-200"
            onClick={saveTableChanges}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Lưu thay đổi nhanh
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={handleOpenConfig}
        >
          <Settings2 className="h-4 w-4" />
          Cấu hình quỹ phép {currentYear}
        </Button>
      </div>

      {balances.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-medium italic">
            Nhân viên này chưa được cấp quỹ nghỉ phép nào.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <Card
              key={year}
              className="border-none shadow-md overflow-hidden rounded-xl"
            >
              <CardHeader className="bg-slate-50/80 border-b py-3 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                    Quỹ nghỉ phép năm {year}
                  </CardTitle>
                </div>
                {year === currentYear && (
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">
                    Có thể sửa trực tiếp
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b bg-slate-50/30">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500">
                          Loại phép
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center">
                          Hưởng lương
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center w-32">
                          Tổng cấp
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center">
                          Đã sử dụng
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center">
                          Còn lại
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {balances
                        .filter((b) => b.year === year)
                        .map((b) => (
                          <tr
                            key={b.id}
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">
                                  {b.leaveType.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {b.leaveType.code}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {b.leaveType.isPaid ? (
                                <div className="flex items-center justify-center gap-1 text-emerald-600">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  <span className="text-[10px] uppercase font-bold text-emerald-600">
                                    Có
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1 text-slate-400">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  <span className="text-[10px] uppercase font-bold">
                                    Không
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Input
                                type="number"
                                className="h-8 w-20 mx-auto text-center font-bold border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-0 bg-transparent"
                                value={tableData[b.id] ?? Number(b.totalDays)}
                                onChange={(e) =>
                                  handleTableEdit(b.id, e.target.value)
                                }
                              />
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-rose-500">
                              {Number(b.usedDays)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold px-3 shadow-sm min-w-[2.5rem] justify-center">
                                {Number(tableData[b.id] ?? b.totalDays) -
                                  Number(b.usedDays)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DIALOG CẤU HÌNH (Để thêm loại mới) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">
              Cấp thêm loại nghỉ phép - {currentYear}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
              {ltLoading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="animate-spin h-8 w-8 text-emerald-500/20" />
                </div>
              ) : (
                allLeaveTypes.map((lt) => {
                  const config = configs.find((c) => c.id === lt.id);
                  const active = !!config;

                  return (
                    <div
                      key={lt.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-50/30 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div
                        className="flex items-center gap-4 flex-1"
                        onClick={() => toggleSelect(lt)}
                      >
                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            active
                              ? "bg-emerald-600 border-emerald-600"
                              : "bg-white border-slate-300"
                          }`}
                        >
                          {active && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-bold ${active ? "text-emerald-900" : "text-slate-700"}`}
                          >
                            {lt.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Định mức: {lt.defaultDays} ngày
                          </p>
                        </div>
                      </div>

                      {active && (
                        <div className="flex items-center gap-2 pl-4 border-l border-emerald-200">
                          <Input
                            type="number"
                            className="h-8 w-16 text-center font-bold"
                            value={config.totalDays}
                            onChange={(e) =>
                              updateModalDays(lt.id, e.target.value)
                            }
                          />
                          <span className="text-xs font-bold text-slate-400">
                            Ngày
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              className="bg-emerald-600"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(configs)}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
