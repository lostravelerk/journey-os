"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
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
          "fixed right-4 top-4 z-40 grid h-9 w-9 place-items-center rounded-full text-white/26 transition hover:bg-white/12 hover:text-white/62 sm:right-5 sm:top-5",
          pathname === "/settings" && "bg-black/6 text-black/56 dark:bg-white/10 dark:text-white/68"
        )}
      >
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}
