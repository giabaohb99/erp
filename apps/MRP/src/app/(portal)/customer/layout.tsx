import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | BaoERP MRP',
    default: 'Customer Portal | BaoERP MRP',
  },
  description: 'Customer portal dashboard - Overview of orders, deliveries, invoices, and support - Cổng khách hàng BaoERP MRP',
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
