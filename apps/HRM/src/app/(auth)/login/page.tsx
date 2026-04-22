"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, LogIn, Copy, Check } from "lucide-react"
/* eslint-disable @next/next/no-img-element */

const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO === "true"

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@rtr.vn", role: "Quản trị viên" },
  { label: "HR Manager", email: "hr@rtr.vn", role: "Trưởng phòng HR" },
  { label: "HR Staff", email: "hrstaff@rtr.vn", role: "Chuyên viên HR" },
  { label: "Dept Manager", email: "kythuat.mgr@rtr.vn", role: "Quản lý phòng ban" },
  { label: "Employee", email: "nhanvien@rtr.vn", role: "Nhân viên" },
  { label: "Accountant", email: "ketoan@rtr.vn", role: "Kế toán" },
]

const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || ""

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("admin@rtr.vn")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Email hoặc mật khẩu không đúng")
      return
    }

    router.push("/")
    router.refresh()
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number], idx: number) {
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    setError("")
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 relative overflow-hidden"
        style={{ backgroundColor: "#1E3A5F" }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Accent glow */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-10 bg-white blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-[0.07] bg-white blur-3xl" />

        <div className="relative z-10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width={140} height={42} className="mb-4">
            <rect width="40" height="40" rx="8" fill="#3B82F6" />
            <path d="M14 14h8a6 6 0 0 1 0 12h-8V14z" fill="white" />
            <text x="52" y="30" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="28" fill="white">POD ERP</text>
          </svg>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-white text-3xl font-bold leading-tight">
              Hệ thống Quản lý
              <br />
              Nhân sự
            </h1>
            <p className="text-white/60 mt-3 text-sm leading-relaxed max-w-[320px]">
              Quản lý toàn diện thông tin nhân viên, hợp đồng, chấm công và lương thưởng cho Pod ERP Vietnam.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-[#1E3A5F] bg-white/20 backdrop-blur-sm flex items-center justify-center text-[10px] text-white font-medium"
                >
                  {["AD", "HR", "MG", "NV"][i]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} Pod ERP Vietnam. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width={24} height={24}>
                <path d="M14 14h8a6 6 0 0 1 0 12h-8V14z" fill="white" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg leading-none">POD HRM</p>
              <p className="text-slate-500 text-xs">Pod ERP Vietnam</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
            <p className="text-slate-500 text-sm mt-1">
              Nhập thông tin tài khoản để truy cập hệ thống
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 text-sm font-medium">
                Email / Mã nhân viên
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="VD: nv@rtr.vn hoặc POD0001"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-white border-slate-200 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 bg-white border-slate-200 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold transition-all duration-200 hover:opacity-90"
              disabled={loading}
              style={{ backgroundColor: "#1E3A5F" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </span>
              )}
            </Button>
          </form>

          {/* Demo Accounts — only shown when NEXT_PUBLIC_SHOW_DEMO=true */}
          {SHOW_DEMO && DEMO_PASSWORD && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Demo Accounts
                </span>
                <span className="text-[10px] text-slate-400 ml-auto">
                  Pass: {DEMO_PASSWORD}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc, i) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc, i)}
                    className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#1E3A5F]/30 hover:bg-[#1E3A5F]/[0.02] transition-all duration-150 text-left"
                  >
                    <div
                      className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: "#1E3A5F", opacity: 0.8 + i * 0.04 }}
                    >
                      {acc.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{acc.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{acc.role}</p>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {copiedIdx === i ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
