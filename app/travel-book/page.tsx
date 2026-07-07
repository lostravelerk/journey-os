"use client";

import { BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { useJourney } from "@/components/journey-provider";
import { primaryMemory } from "@/lib/engines/memory-engine";
import { buildTravelBookHtml, TravelBookVisibility } from "@/lib/travel-book";
import { downloadTextFile } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export default function TravelBookPage() {
  const { journey, trip, loading } = useJourney();
  const { locale, t, formatDate, formatDateRange } = useI18n();

  if (loading || !journey || !trip) {
    return (
      <Section>
        <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
      </Section>
    );
  }

  const memoryCount = journey.days.reduce((count, day) => count + day.memories.length, 0);
  const photoCount = trip.days.reduce((count, day) => count + (day.photos?.length ?? 0), 0);
  const storyCount = journey.days.filter((day) => day.story).length;
  const firstMemory = journey.days.map((day) => primaryMemory(day)?.content).find(Boolean) ?? t("travelBook.openingLine");

  function exportBook(visibility: TravelBookVisibility) {
    if (!trip) return;
    const html = buildTravelBookHtml(trip, visibility, {
      lang: locale,
      formatDate,
      formatDateRange,
      copy: {
        journeyDay: t("travelBookExport.journeyDay"),
        fallbackDayTitle: t("travelBookExport.fallbackDayTitle"),
        privateMemoryBook: t("travelBookExport.privateMemoryBook"),
        shareSafeMemoryBook: t("travelBookExport.shareSafeMemoryBook"),
        titleSuffix: t("travelBookExport.titleSuffix"),
        footer: t("travelBookExport.footer")
      }
    });
    downloadTextFile(
      `journey-os-${visibility}-travel-book-${trip.endDate}.html`,
      html,
      "text/html"
    );
  }

  return (
    <Section className="mx-auto max-w-4xl py-10 sm:py-16">
      <Card className="overflow-hidden">
        <div className="min-h-[68svh] p-6 sm:p-10">
          <BookOpen className="h-7 w-7 text-brass" />
          <div className="mt-20 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.18em] text-black/42 dark:text-white/42">{t("travelBook.title")}</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-0 sm:text-6xl">{journey.title}</h1>
            <p className="mt-6 text-xl leading-8 text-black/62 dark:text-white/62">{firstMemory}</p>
          </div>

          <div className="mt-16 grid gap-3 text-sm text-black/52 dark:text-white/52 sm:grid-cols-4">
            <span>{t("common.days", { count: journey.days.length })}</span>
            <span>{t("travelBook.memoryCount", { count: memoryCount })}</span>
            <span>{t("common.photoCount", { count: photoCount })}</span>
            <span>{t("travelBook.storyCount", { count: storyCount })}</span>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button onClick={() => exportBook("private")}>
              <BookOpen className="h-4 w-4" />
              {t("travelBook.openBook")}
            </Button>
            <Button variant="secondary" onClick={() => exportBook("share-safe")}>
              <Download className="h-4 w-4" />
              {t("travelBook.backup")}
            </Button>
          </div>
        </div>
      </Card>
    </Section>
  );
}
