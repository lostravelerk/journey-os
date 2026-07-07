"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/field";
import { useJourney } from "@/components/journey-provider";
import { buildShareStory } from "@/lib/share-generator";
import { ShareStory } from "@/lib/schema";
import { primaryMemory } from "@/lib/engines/memory-engine";
import { useI18n } from "@/lib/i18n";

export default function SharePage() {
  const router = useRouter();
  const { journey, trip, loading, saveStory } = useJourney();
  const { t } = useI18n();
  const [selectedDayId, setSelectedDayId] = React.useState("");
  const [seedText, setSeedText] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [draft, setDraft] = React.useState<ShareStory | null>(null);

  React.useEffect(() => {
    if (trip && !trip.days.some((day) => day.id === selectedDayId)) {
      const requestedDayId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("day") ?? "" : "";
      setSelectedDayId(trip.days.some((day) => day.id === requestedDayId) ? requestedDayId : trip.days[0]?.id ?? "");
    }
  }, [selectedDayId, trip]);

  if (loading || !journey || !trip) {
    return (
      <Section>
        <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
      </Section>
    );
  }

  const currentTrip = trip;
  const memoryDays = trip.days.filter((day) => {
    const journeyDay = journey.days.find((item) => item.id === day.id);
    return Boolean(journeyDay && primaryMemory(journeyDay));
  });
  const selectableDays = memoryDays.length ? memoryDays : trip.days;
  const effectiveSeedText = seedText.trim() || t("share.seedDefault");
  const storyCopy = {
    defaultTitle: t("shareStory.defaultTitle"),
    fallbackRoute: t("shareStory.fallbackRoute"),
    changingWeather: t("shareStory.changingWeather"),
    rangeTitle: t("shareStory.rangeTitle"),
    subtitle: t("shareStory.subtitle"),
    defaultSeed: t("shareStory.defaultSeed"),
    bodyMiddle: t("shareStory.bodyMiddle"),
    bodyPrivacy: t("shareStory.bodyPrivacy"),
    closing: t("shareStory.closing"),
    firstScene: t("shareStory.firstScene"),
    roadScene: t("shareStory.roadScene"),
    stopScene: t("shareStory.stopScene"),
    smallScene: t("shareStory.smallScene"),
    momentsCopy: t("shareStory.momentsCopy")
  };

  function prepareStory() {
    if (!selectedDayId) return;
    setDraft(buildShareStory({ trip: currentTrip, dayIds: [selectedDayId], theme: "soft_journal", seedText: effectiveSeedText, copy: storyCopy }));
  }

  async function publish() {
    const story = draft ?? buildShareStory({ trip: currentTrip, dayIds: [selectedDayId], theme: "soft_journal", seedText: effectiveSeedText, copy: storyCopy });
    await saveStory(story);
    router.push(`/story?story=${encodeURIComponent(story.id)}`);
  }

  return (
    <Section className="mx-auto max-w-4xl space-y-10 py-10 sm:py-16">
      <div>
        <h1 className="text-4xl font-semibold tracking-0 sm:text-6xl">{t("share.title")}</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-black/52 dark:text-white/52">{t("share.description")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-4">
            <Select value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)}>
              {selectableDays.map((day) => {
                const journeyDay = journey.days.find((item) => item.id === day.id);
                const memory = journeyDay ? primaryMemory(journeyDay) : undefined;
                return (
                  <option key={day.id} value={day.id}>
                    {memory?.content ?? `${day.date} · ${day.routeLabel ?? day.city}`}
                  </option>
                );
              })}
            </Select>
            <Textarea
              className="min-h-32"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value)}
              placeholder={t("share.seedDefault")}
            />
            <Button data-testid="generate-copy" variant="secondary" onClick={prepareStory}>
              {t("share.prepareStory")}
            </Button>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-black/40 dark:text-white/40">{t("share.preview")}</p>
            <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-0">{draft?.title ?? t("share.titlePlaceholder")}</h2>
            <p className="mt-4 text-sm leading-6 text-black/52 dark:text-white/52">{draft?.subtitle ?? t("share.previewHint")}</p>
            {draft?.memoryBody ? (
              <p className="mt-7 whitespace-pre-line text-base leading-8 text-black/68 dark:text-white/68">{draft.memoryBody}</p>
            ) : null}
          </Card>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-black/52 dark:text-white/52">
            <input
              data-testid="confirm-privacy"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="h-4 w-4 accent-brass"
            />
            {t("share.reviewed")}
          </label>

          <Button data-testid="publish-story" onClick={() => void publish()} disabled={!confirmed || !selectedDayId}>
            <Send className="h-4 w-4" />
            {t("share.create")}
          </Button>
        </div>
      </div>
    </Section>
  );
}
