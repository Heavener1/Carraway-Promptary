import type { Metadata } from "next";

import { PublishForm } from "@/components/publish-form";

export const metadata: Metadata = {
  title: "分享提示词",
  description: "分享你的文生图、图生图、文生视频、图生视频提示词与参数。",
};

export default function PublishPage() {
  return (
    <div className="py-4 sm:py-8">
      <PublishForm />
    </div>
  );
}
