import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | BaoERP MRP',
    default: 'Discussions | BaoERP MRP',
  },
  description: 'Internal discussions, information exchange, and team collaboration - Thảo luận nội bộ, trao đổi thông tin và cộng tác nhóm',
};

export default function DiscussionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
