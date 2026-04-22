import type { Metadata } from 'next';
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Dashboard | BaoERP MRP',
  description: 'BaoERP MRP manufacturing dashboard overview - Tổng quan bảng điều khiển sản xuất BaoERP MRP',
};

// Redirect to main dashboard
export default function DashboardRedirect() {
  redirect("/home");
}
