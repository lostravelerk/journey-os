"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, Section } from "@/components/ui/card";
import { Locale, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const languageOptions: { locale: Locale; labelKey: string }[] = [
  { locale: "zh-CN", labelKey: "settings.chinese" },
  { locale: "en-US", labelKey: "settings.english" }
];

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();

  return (
    <Section className="space-y-5">
      <div>
        <Badge tone="green">{t("settings.badge")}</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-0 sm:text-6xl">{t("settings.title")}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-black/55 dark:text-white/55">{t("settings.description")}</p>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3">
          {languageOptions.map((option) => {
            const active = option.locale === locale;
            return (
              <button
                key={option.locale}
                type="button"
                onClick={() => setLocale(option.locale)}
                className={cn(
                  "flex h-14 items-center justify-between rounded-lg border px-4 text-left text-sm transition",
                  active
                    ? "border-moss/28 bg-moss/[0.06] text-ink dark:text-paper"
                    : "border-black/10 bg-white/45 text-black/62 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-white/62 dark:hover:bg-white/10"
                )}
              >
                <span>{t(option.labelKey)}</span>
                {active ? (
                  <span className="inline-flex items-center gap-2 text-xs text-moss dark:text-emerald-200">
                    <Check className="h-4 w-4" />
                    {t("settings.current")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>
    </Section>
  );
}
