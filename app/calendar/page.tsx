"use client";

import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { Section } from "@/components/ui/card";
import { useJourney } from "@/components/journey-provider";
import { getCurrentJourneyDay } from "@/lib/engines/journey-engine";
import { primaryMemory } from "@/lib/engines/memory-engine";
import { useI18n } from "@/lib/i18n";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default function CalendarPage() {
  const { journey, trip, loading } = useJourney();
  const { t, formatDate } = useI18n();

  if (loading || !journey || !trip) {
    return (
      <Section>
        <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
      </Section>
    );
  }

  const currentJourneyDay = getCurrentJourneyDay(journey, todayIso());
  const rememberedDays = trip.days
    .map((day) => {
      const journeyDay = journey.days.find((item) => item.id === day.id);
      return {
        day,
        journeyDay,
        memory: journeyDay ? primaryMemory(journeyDay) : undefined,
        photoCount: day.photos?.length ?? 0
      };
    })
    .filter((item) => item.memory);

  const visibleDays = rememberedDays.length
    ? rememberedDays
    : trip.days
        .filter((day) => day.id === currentJourneyDay.id)
        .map((day) => ({
          day,
          journeyDay: currentJourneyDay,
          memory: undefined,
          photoCount: day.photos?.length ?? 0
        }));

  return (
    <Section className="mx-auto max-w-3xl space-y-10 py-10 sm:py-16">
      <div>
        <h1 className="text-4xl font-semibold tracking-0 sm:text-6xl">{t("memory.title")}</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-black/52 dark:text-white/52">{t("memory.description")}</p>
      </div>

      <div className="divide-y divide-black/10 dark:divide-white/10">
        {visibleDays.map(({ day, memory, photoCount }) => (
          <Link
            key={day.id}
            href={`/day?day=${encodeURIComponent(day.id)}`}
            className="group block py-7 transition hover:text-moss dark:hover:text-white"
          >
            <h2 className="text-2xl font-semibold leading-tight tracking-0 sm:text-3xl">
              {memory?.content || t("memory.emptyLine")}
            </h2>
            <p className="mt-3 text-sm text-black/45 dark:text-white/45">
              {formatDate(day.date)} · {t("common.photoCount", { count: photoCount })}
            </p>
          </Link>
        ))}
      </div>

      <Link
        href={`/day?day=${encodeURIComponent(visibleDays[0]?.day.id ?? currentJourneyDay.id)}`}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper shadow-soft dark:bg-paper dark:text-ink"
      >
        <NotebookPen className="h-4 w-4" />
        {t("memory.write")}
      </Link>
    </Section>
  );
}
