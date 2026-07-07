"use client";

import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/story") {
    return <div className="min-h-screen bg-night text-paper">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-night dark:text-paper">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,#fbfaf6_0%,#f6f7f3_52%,#eef3ef_100%)] dark:bg-[linear-gradient(180deg,#101315,#171815)]" />

      <main>{children}</main>
    </div>
  );
}
