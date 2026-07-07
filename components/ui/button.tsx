import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:focus-visible:ring-offset-night",
        variant === "primary" &&
          "border-ink bg-ink text-paper shadow-soft hover:bg-graphite dark:border-paper dark:bg-paper dark:text-ink dark:hover:bg-white",
        variant === "secondary" &&
          "border-black/8 bg-porcelain/72 text-ink hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-paper dark:hover:bg-white/15",
        variant === "ghost" &&
          "border-transparent bg-transparent text-ink hover:bg-black/5 dark:text-paper dark:hover:bg-white/10",
        variant === "danger" &&
          "border-signal/20 bg-signal/10 text-signal hover:bg-signal/15",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "icon" && "h-10 w-10 p-0",
        className
      )}
      {...props}
    />
  );
}
