import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | BaoERP MRP',
    default: 'Khách hàng',
  },
  description: 'Quản lý thông tin khách hàng và phân hạng khách hàng',
};

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
