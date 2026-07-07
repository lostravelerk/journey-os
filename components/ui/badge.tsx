import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "green" | "gold" | "red" | "blue";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]",
        tone === "neutral" && "border-black/8 bg-black/[0.025] text-graphite dark:border-white/12 dark:bg-white/8 dark:text-paper",
        tone === "green" && "border-moss/18 bg-moss/[0.08] text-moss dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100",
        tone === "gold" && "border-brass/20 bg-brass/[0.08] text-brass",
        tone === "red" && "border-signal/22 bg-signal/[0.08] text-signal",
        tone === "blue" && "border-sky-400/20 bg-sky-400/[0.08] text-sky-800 dark:text-sky-100",
        className
      )}
      {...props}
    />
  );
}
