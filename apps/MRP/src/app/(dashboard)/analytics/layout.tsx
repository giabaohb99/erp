import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | BaoERP MRP',
    default: 'Analytics Dashboard | BaoERP MRP',
  },
  description: 'Data analytics, KPIs, and custom dashboards for manufacturing insights - Phân tích dữ liệu, KPI và dashboard tùy chỉnh',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
