import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | BaoERP MRP',
    default: 'Bill of Materials | BaoERP MRP',
  },
  description: 'Manage product structures (Bill of Materials) and BOM versions - Quản lý cấu trúc sản phẩm (BOM) và phiên bản BOM',
};

export default function BomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
