import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-2xl font-semibold">页面不存在</h1>
      <p className="mt-2 text-sm text-muted">
        这个提示词可能已被删除，或者链接有误。
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
      >
        返回发现页
      </Link>
    </div>
  );
}
