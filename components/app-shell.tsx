"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  if (pathname === "/story") {
    return <div className="min-h-screen bg-night text-paper">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-night dark:text-paper">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,#fbfaf6_0%,#f6f7f3_52%,#eef3ef_100%)] dark:bg-[linear-gradient(180deg,#101315,#171815)]" />

      <main>{children}</main>

      <Link
        href="/settings"
        aria-label={t("nav.settings")}
        title={t("nav.settings")}
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 z-40 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/8 text-white/28 shadow-soft backdrop-blur-xl transition hover:bg-black/14 hover:text-white/58 sm:left-5",
          pathname !== "/" && "border-black/8 bg-white/58 text-black/30 hover:bg-white/78 hover:text-black/54 dark:border-white/10 dark:bg-white/8 dark:text-white/34 dark:hover:bg-white/12 dark:hover:text-white/62",
          pathname === "/settings" && "bg-black/10 text-black/58 dark:bg-white/10 dark:text-white/68"
        )}
      >
        <MoreHorizontal className="h-5 w-5" />
      </Link>
    </div>
  );
}
