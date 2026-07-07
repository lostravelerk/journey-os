import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium uppercase tracking-[0.08em] text-black/55 dark:text-white/55", className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-black/8 bg-porcelain/74 px-3 text-sm text-ink outline-none transition placeholder:text-black/35 focus:border-moss/40 focus:ring-2 focus:ring-moss/15 dark:border-white/10 dark:bg-white/8 dark:text-paper dark:placeholder:text-white/35",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-lg border border-black/8 bg-porcelain/74 px-3 py-3 text-sm text-ink outline-none transition placeholder:text-black/35 focus:border-moss/40 focus:ring-2 focus:ring-moss/15 dark:border-white/10 dark:bg-white/8 dark:text-paper dark:placeholder:text-white/35",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-black/8 bg-porcelain/74 px-3 text-sm text-ink outline-none transition focus:border-moss/40 focus:ring-2 focus:ring-moss/15 dark:border-white/10 dark:bg-white/8 dark:text-paper",
        className
      )}
      {...props}
    />
  );
}
