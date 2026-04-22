import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: '%s | BaoERP MRP',
    default: 'Sign In | BaoERP MRP',
  },
  description: 'Sign in to BaoERP MRP manufacturing resource planning system - Đăng nhập vào hệ thống quản lý sản xuất BaoERP MRP',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}
