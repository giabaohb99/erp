"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Info,
  ChevronRight,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeavePolicy {
  resetType: string;
  resetMonth: number;
  allowRollover: boolean;
  maxRolloverDays: number;
  rolloverExpiryMonth: number;
  autoAccrue: boolean;
  accrueAmount: number;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  defaultDays: number;
  isPaid: boolean;
  isActive: boolean;
  policy?: LeavePolicy;
}

export default function LeaveConfigPage() {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [editId, setEditId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LeaveType | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    defaultDays: "12",
    isPaid: true,
    isActive: true,
    policy: {
      resetType: "ANNUAL",
      resetMonth: 1,
      allowRollover: false,
      maxRolloverDays: 0,
      rolloverExpiryMonth: 3,
      autoAccrue: false,
      accrueAmount: 0,
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: leaveTypes = [], isLoading } = useQuery<LeaveType[]>({
    queryKey: ["leave-types"],
    queryFn: async () => {
      const res = await fetch("/api/leave-types");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editId ? `/api/leave-types/${editId}` : "/api/leave-types";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi xử lý");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      setOpen(false);
      setEditId(null);
      toast({
        title: editId ? "Đã cập nhật thành công" : "Đã tạo mới cấu hình",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leave-types/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể xóa");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      setDeleteOpen(false);
      setItemToDelete(null);
      toast({ title: "Đã xóa thành công" });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenEdit = (lt: LeaveType) => {
    setEditId(lt.id);
    setActiveTab("basic");
    setFormData({
      name: lt.name,
      code: lt.code,
      defaultDays: String(lt.defaultDays),
      isPaid: lt.isPaid,
      isActive: lt.isActive,
      policy: lt.policy || {
        resetType: "ANNUAL",
        resetMonth: 1,
        allowRollover: false,
        maxRolloverDays: 0,
        rolloverExpiryMonth: 3,
        autoAccrue: false,
        accrueAmount: 0,
      },
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setActiveTab("basic");
    setFormData({
      name: "",
      code: "",
      defaultDays: "12",
      isPaid: true,
      isActive: true,
      policy: {
        resetType: "ANNUAL",
        resetMonth: 1,
        allowRollover: false,
        maxRolloverDays: 0,
        rolloverExpiryMonth: 3,
        autoAccrue: false,
        accrueAmount: 0,
      },
    });
    setOpen(true);
  };

  const confirmDelete = (lt: LeaveType) => {
    setItemToDelete(lt);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Cấu hình Hệ thống Nghỉ phép
          </h1>
          <p className="text-muted-foreground text-sm">
            Quản lý loại phép và chính sách cộng dồn cho nhân viên
          </p>
        </div>
        <Button
          onClick={resetForm}
          className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Thêm loại phép mới
        </Button>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Mã & Tên loại phép
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center tracking-wider">
                    Định mức
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center tracking-wider">
                    Trả lương
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center tracking-wider">
                    Tự cộng dồn
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-center tracking-wider">
                    Chính sách chuyển
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 text-right tracking-wider">
                    Tùy chỉnh
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400 italic"
                    >
                      Đang tải...
                    </td>
                  </tr>
                ) : leaveTypes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-20 text-center text-slate-400"
                    >
                      Chưa có cấu hình nghỉ phép nào.
                    </td>
                  </tr>
                ) : (
                  leaveTypes.map((lt) => (
                    <tr
                      key={lt.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${lt.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}
                          >
                            <Settings className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 leading-tight">
                              {lt.name}
                            </p>
                            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                              {lt.code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                          {Number(lt.defaultDays)} ngày
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {lt.isPaid ? (
                          <div className="inline-flex items-center gap-1 text-emerald-600">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-bold">
                              Có lương
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-slate-400">
                            <ShieldAlert className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-bold">
                              Không
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {lt.policy?.autoAccrue ? (
                          <span className="px-2 py-1 bg-blue-500 text-white rounded text-[9px] uppercase font-bold inline-block leading-none">
                            +{lt.policy.accrueAmount}/tháng
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            Thủ công
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {lt.policy?.allowRollover ? (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-0.5 border border-emerald-200 text-emerald-600 rounded-full text-[9px] font-bold">
                              Tối đa {lt.policy.maxRolloverDays} ngày
                            </span>
                            <span className="text-[8px] text-slate-400 italic font-medium">
                              Hết hạn: Tháng {lt.policy.rolloverExpiryMonth}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300">
                            Không hỗ trợ
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                            onClick={() => handleOpenEdit(lt)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                            onClick={() => confirmDelete(lt)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL CẤU HÌNH / THÊM MỚI */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
          <DialogHeader className="p-6 bg-slate-900 border-b border-slate-800 text-white">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-500" />
              {editId ? "Cấu hình Chính sách Nghỉ" : "Loại Nghỉ phép Mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="w-full">
            <div className="px-6 py-2 bg-slate-50 border-b flex gap-2">
              <button
                onClick={() => setActiveTab("basic")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "basic" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200"}`}
              >
                Cấu hình Cơ bản
              </button>
              <button
                onClick={() => setActiveTab("policy")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "policy" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200"}`}
              >
                Chính sách Nâng cao
              </button>
            </div>

            <div className="p-6 min-h-[400px]">
              {activeTab === "basic" ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-bold">
                        Tên loại phép
                      </Label>
                      <Input
                        placeholder="VD: Nghỉ phép năm"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-bold">
                        Mã định danh (Shortcode)
                      </Label>
                      <Input
                        placeholder="VD: AL"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-bold">
                        Định mức mặc định (năm)
                      </Label>
                      <Input
                        type="number"
                        value={formData.defaultDays}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            defaultDays: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-bold">
                        Trả lương
                      </Label>
                      <Select
                        value={formData.isPaid ? "true" : "false"}
                        onValueChange={(val) =>
                          setFormData({ ...formData, isPaid: val === "true" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">
                            Có lương (Full Pay)
                          </SelectItem>
                          <SelectItem value="false">
                            Nghỉ không lương (Unpaid)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-600 font-bold">
                      Trạng thái phát hành
                    </Label>
                    <Select
                      value={formData.isActive ? "true" : "false"}
                      onValueChange={(val) =>
                        setFormData({ ...formData, isActive: val === "true" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">
                          Đang hoạt động (Cho phép nộp đơn)
                        </SelectItem>
                        <SelectItem value="false">
                          Tạm ngưng (Ẩn khỏi đơn nộp)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      <h4 className="font-bold text-slate-800 text-sm">
                        Chu kỳ làm mới (Annual Reset)
                      </h4>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[10px] text-slate-400 max-w-[200px]">
                        Tháng hệ thống tự động làm mới quỹ phép về định mức ban
                        đầu
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600">
                          Tháng:
                        </span>
                        <Select
                          value={String(formData.policy.resetMonth)}
                          onValueChange={(v) =>
                            setFormData({
                              ...formData,
                              policy: {
                                ...formData.policy,
                                resetMonth: Number(v),
                              },
                            })
                          }
                        >
                          <SelectTrigger className="w-28 bg-white h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(
                              (m) => (
                                <SelectItem key={m} value={String(m)}>
                                  Tháng {m}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Cộng dồn phép dư (Rollover)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Tự động cộng ngày phép chưa dùng vào quỹ năm mới
                        </p>
                      </div>
                      <Select
                        value={formData.policy.allowRollover ? "true" : "false"}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            policy: {
                              ...formData.policy,
                              allowRollover: v === "true",
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-24 border-none bg-white shadow-sm ring-1 ring-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Bật</SelectItem>
                          <SelectItem value="false">Tắt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.policy.allowRollover && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 animate-in zoom-in-95 duration-200">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-emerald-800 uppercase">
                            Tối đa ngày chuyển
                          </Label>
                          <Input
                            type="number"
                            className="bg-white h-9"
                            value={formData.policy.maxRolloverDays}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                policy: {
                                  ...formData.policy,
                                  maxRolloverDays: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-emerald-800 uppercase">
                            Hạn dùng phép cũ
                          </Label>
                          <Select
                            value={String(formData.policy.rolloverExpiryMonth)}
                            onValueChange={(v) =>
                              setFormData({
                                ...formData,
                                policy: {
                                  ...formData.policy,
                                  rolloverExpiryMonth: Number(v),
                                },
                              })
                            }
                          >
                            <SelectTrigger className="bg-white h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6].map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                  Hết tháng {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Tự động tích lũy hàng tháng (Accrual)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Nhân viên nhận thêm ngày phép sau mỗi tháng làm việc
                        </p>
                      </div>
                      <Select
                        value={formData.policy.autoAccrue ? "true" : "false"}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            policy: {
                              ...formData.policy,
                              autoAccrue: v === "true",
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-24 border-none bg-white shadow-sm ring-1 ring-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Bật</SelectItem>
                          <SelectItem value="false">Tắt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.policy.autoAccrue && (
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-in zoom-in-95 duration-200 flex items-center gap-4">
                        <Label className="text-[11px] font-bold text-blue-800 uppercase whitespace-nowrap">
                          Ngày cộng mỗi tháng:
                        </Label>
                        <Input
                          className="w-24 bg-white h-9"
                          type="number"
                          value={formData.policy.accrueAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              policy: {
                                ...formData.policy,
                                accrueAmount: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-amber-50 text-[10px] text-amber-700 rounded-lg flex items-start gap-2 border border-amber-100 font-medium">
                    <Info className="h-4 w-4 shrink-0" />
                    Lưu ý: Hệ thống sẽ dựa trên Tháng làm mới (Reset Month) để
                    thực hiện các tính toán cộng dồn phép dư khi bước sang chu
                    kỳ mới.
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t gap-3 flex items-center justify-end">
            <button
              onClick={() => setOpen(false)}
              className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Hủy bỏ
            </button>
            <Button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(formData)}
              className="bg-slate-900 hover:bg-black px-10 h-11 rounded-xl font-bold shadow-xl shadow-slate-300"
            >
              {mutation.isPending ? (
                "Đang lưu..."
              ) : (
                <span className="flex items-center gap-2">
                  Lưu Cấu hình <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL XÁC NHẬN XÓA */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-900">
              Xác nhận xóa?
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Bạn có chắc chắn muốn xóa loại phép{" "}
              <span className="font-bold text-red-600">
                "{itemToDelete?.name}"
              </span>
              ? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1 font-bold"
              onClick={() => setDeleteOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 font-bold"
              disabled={deleteMutation.isPending}
              onClick={() =>
                itemToDelete && deleteMutation.mutate(itemToDelete.id)
              }
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Vâng, Xóa ngay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "outline";
}) {
  const variants = {
    default: "bg-slate-900 text-white",
    secondary: "bg-slate-100 text-slate-900",
    outline: "border border-slate-200 text-slate-900",
  };
  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
