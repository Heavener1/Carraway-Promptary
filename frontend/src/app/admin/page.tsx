import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "内容审核",
  description: "Promptary 管理后台",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="py-4 sm:py-8">
      <AdminDashboard />
    </div>
  );
}
