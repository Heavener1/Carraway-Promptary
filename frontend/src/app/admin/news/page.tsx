import type { Metadata } from "next";

import { AdminNews } from "@/components/admin-news";

export const metadata: Metadata = {
  title: "资讯管理",
  description: "Promptary 资讯管理后台",
  robots: { index: false, follow: false },
};

export default function AdminNewsPage() {
  return (
    <div className="py-4 sm:py-8">
      <AdminNews />
    </div>
  );
}
