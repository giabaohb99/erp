"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LeaveBalance {
  id: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  leaveType: {
    name: string;
    code: string;
  };
}

interface EmployeeLeaveData {
  id: string;
  displayName: string;
  employeeCode: string;
  department?: { name: string };
  leaveBalances: LeaveBalance[];
}

export function EmployeeLeaveTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employees = [], isLoading } = useQuery<EmployeeLeaveData[]>({
    queryKey: ["admin-leave-balances"],
    queryFn: async () => {
      const res = await fetch("/api/admin/leave-balances");
      if (!res.ok) throw new Error("Failed to load balances");
      return res.json();
    },
  });

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>Đang tổng hợp dữ liệu quỹ phép...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Tìm theo tên, mã nhân viên hoặc phòng ban..."
          className="pl-10 bg-white border-slate-200 h-11 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500">
                    Nhân viên
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500">
                    Phòng ban
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-500">
                    Chi tiết Nghỉ phép
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-slate-400 italic"
                    >
                      Không tìm thấy nhân viên nào khớp với tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            {emp.displayName}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                            {emp.employeeCode}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600">
                          {emp.department?.name || "---"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {emp.leaveBalances.length === 0 ? (
                            <span className="text-[10px] text-slate-300 italic">
                              Chưa cấp phép
                            </span>
                          ) : (
                            emp.leaveBalances.map((lb) => (
                              <div
                                key={lb.id}
                                className="px-2 py-1 bg-slate-100 rounded-lg flex flex-col min-w-[80px]"
                              >
                                <span className="text-[9px] font-bold text-slate-500 uppercase">
                                  {lb.leaveType.code}
                                </span>
                                <div className="flex justify-between items-end">
                                  <span className="text-xs font-black text-slate-800">
                                    {Number(lb.remainingDays)}
                                  </span>
                                  <span className="text-[8px] text-slate-400">
                                    / {Number(lb.totalDays)}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
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
    </div>
  );
}
