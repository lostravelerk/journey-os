"use client";

import * as React from "react";
import Link from "next/link";
import { CloudSun, MapPin, Plus } from "lucide-react";
import { useJourney } from "@/components/journey-provider";
import { getCurrentJourneyDay } from "@/lib/engines/journey-engine";
import { primaryMemory } from "@/lib/engines/memory-engine";
import { firstTimedEvent } from "@/lib/engines/timeline-engine";
import { useI18n } from "@/lib/i18n";

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80";
const fallbackMemoryImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80";
const fallbackJourneyImage =
  "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1400&q=80";

function TimeAxis({ active }: { active: "memory" | "now" | "journey" }) {
  const { t } = useI18n();
  const points = ["memory", "now", "journey"] as const;

  return (
    <div className="pointer-events-none absolute left-5 right-5 top-6 z-20 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/46">
      {points.map((point, index) => (
        <React.Fragment key={point}>
          {index > 0 ? <span className="h-px flex-1 bg-white/22" /> : null}
          <span className={point === active ? "text-white/86" : "text-white/42"}>{t(`timeSpace.axis.${point}`)}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function SpaceAxis({ place, tone = "dark" }: { place: string; tone?: "dark" | "light" }) {
  const textColor = tone === "light" ? "text-white/72" : "text-black/52";
  const lineColor = tone === "light" ? "border-white/28" : "border-black/14";
  const dotColor = tone === "light" ? "bg-white/72" : "bg-ink/52";
  const surface = tone === "light" ? "bg-white/10" : "bg-white/54";

  return (
    <div className={`pointer-events-none rounded-[22px] ${surface} px-5 py-4 backdrop-blur-xl`}>
      <div className={`relative h-8 border-t border-dashed ${lineColor}`}>
        <span className={`absolute left-[58%] top-[-6px] h-3 w-3 rounded-full ${dotColor}`} />
        <span className={`absolute left-[58%] top-4 -translate-x-1/2 whitespace-nowrap text-xs ${textColor}`}>
          {place}
        </span>
      </div>
    </div>
  );
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default function TodayPage() {
  const { journey, trip, loading, captureMoment } = useJourney();
  const { t, formatDate } = useI18n();
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const captureInputRef = React.useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = React.useState(false);

  React.useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollTo({ left: slider.clientWidth, behavior: "auto" });
  }, [loading]);

  if (loading || !journey || !trip) {
    return (
      <div className="h-[100svh] bg-ink p-4">
        <div className="h-full animate-pulse rounded-[28px] bg-white/10" />
      </div>
    );
  }

  const currentJourneyDay = getCurrentJourneyDay(journey, todayIso());
  const currentDay = trip.days.find((day) => day.id === currentJourneyDay.id) ?? trip.days.at(-1)!;
  const todayMemory = primaryMemory(currentJourneyDay);
  const todayPhotos = currentDay.photos ?? [];
  const heroImage = todayPhotos[0]?.localUrl ?? fallbackHeroImage;
  const memoryLine = todayMemory?.content || t("today.prototypeLine");
  const todayEvent = firstTimedEvent(currentJourneyDay);
  const weatherLine = currentDay.weather?.description
    ? `${currentDay.weather.description}${currentDay.weather.highC ? ` · ${currentDay.weather.highC}°C` : ""}`
    : t("timeSpace.nowWeather");
  const momentDimensions = [
    { label: t("moment.time"), value: formatDate(currentDay.date) },
    { label: t("moment.place"), value: currentDay.city },
    { label: t("moment.memory"), value: todayMemory ? t("moment.saved") : t("moment.waiting") },
    { label: t("moment.emotion"), value: t("moment.emotionHint") }
  ];

  const memoryItems = journey.days
    .flatMap((day) => {
      const tripDay = trip.days.find((item) => item.id === day.id);
      return day.memories.map((memory) => ({
        id: memory.id,
        day,
        tripDay,
        memory,
        image: tripDay?.photos?.[0]?.localUrl ?? fallbackMemoryImage,
        photoCount: tripDay?.photos?.length ?? 0
      }));
    })
    .sort((a, b) => b.day.date.localeCompare(a.day.date));

  const futureDays = trip.days.filter((day) => day.date >= currentDay.date).slice(0, 7);

  async function handleCapture(files?: FileList | null) {
    if (!files?.length) return;
    setCapturing(true);
    try {
      await captureMoment(currentDay.id, files, t("timeSpace.autoMomentLine"));
    } finally {
      setCapturing(false);
      if (captureInputRef.current) {
        captureInputRef.current.value = "";
      }
    }
  }

  return (
    <div
      ref={sliderRef}
      className="no-scrollbar flex h-[100svh] snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-[#f7f4ed] text-ink"
      aria-label={t("timeSpace.aria")}
    >
      <section className="relative h-[100svh] w-screen shrink-0 snap-center overflow-y-auto bg-[#f6f1e9] px-5 py-7">
        <div className="absolute left-5 right-5 top-6 z-10 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-black/34">
          <span className="text-black/62">{t("timeSpace.axis.memory")}</span>
          <span className="h-px flex-1 bg-black/12" />
          <span>{t("timeSpace.axis.now")}</span>
          <span className="h-px flex-1 bg-black/12" />
          <span>{t("timeSpace.axis.journey")}</span>
        </div>
        <div className="mx-auto flex min-h-full max-w-md flex-col">
          <p className="mt-12 text-sm text-black/46">{t("timeSpace.memorySubtitle")}</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-0">{t("timeSpace.memory")}</h1>

          <div className="mt-8 grid gap-4 pb-8">
            {(memoryItems.length ? memoryItems : [{
              id: "empty-memory",
              day: currentJourneyDay,
              tripDay: currentDay,
              memory: { content: t("memory.emptyLine") },
              image: heroImage,
              photoCount: todayPhotos.length
            }]).map((item) => (
              <Link
                key={item.id}
                href={`/day?day=${encodeURIComponent(item.day.id)}`}
                className="grid grid-cols-[96px_1fr] gap-4 rounded-[22px] bg-white/58 p-3 shadow-soft backdrop-blur-xl"
              >
                <img src={item.image} alt={t("common.storyPhotoAlt")} className="h-24 w-24 rounded-[16px] object-cover" />
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="line-clamp-2 text-lg font-semibold leading-snug">{item.memory.content}</p>
                  <p className="mt-2 text-xs text-black/45">
                    {formatDate(item.day.date)} · {item.tripDay?.city ?? item.tripDay?.routeLabel ?? t("timeSpace.somewhere")}
                  </p>
                  <p className="mt-1 text-xs text-black/38">{t("common.photoCount", { count: item.photoCount })}</p>
                </div>
              </Link>
            ))}
          </div>
          <SpaceAxis place={currentDay.city} />
        </div>
      </section>

      <section className="relative h-[100svh] w-screen shrink-0 snap-center overflow-hidden bg-ink text-paper">
        <TimeAxis active="now" />
        <img src={heroImage} alt={todayPhotos[0]?.caption ?? t("today.heroAlt")} className="absolute inset-0 h-full w-full object-cover opacity-82" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,18,15,.18),rgba(15,18,15,.2)_32%,rgba(15,18,15,.86))]" />
        <div className="relative z-10 flex h-full flex-col justify-between px-5 py-7">
          <div>
            <p className="mt-12 text-sm text-white/62">{t("timeSpace.nowSubtitle")}</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-0">{t("timeSpace.now")}</h1>
          </div>

          <div className="pb-4">
            <div className="mb-10">
              <h2 className="max-w-[20rem] text-4xl font-semibold leading-tight tracking-0">{memoryLine}</h2>
              <div className="mt-5 grid gap-2 text-sm text-white/72">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {currentDay.routeLabel ?? currentDay.city}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CloudSun className="h-4 w-4" />
                  {weatherLine}
                </span>
              </div>
            </div>

            <input
              ref={captureInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => void handleCapture(event.target.files)}
            />
            <button
              type="button"
              onClick={() => captureInputRef.current?.click()}
              disabled={capturing}
              className="flex min-h-24 w-full items-center justify-between rounded-[24px] bg-white/88 p-5 text-ink shadow-story backdrop-blur-xl"
            >
              <div>
                <p className="text-sm text-black/48">{t("timeSpace.nowQuestion")}</p>
                <p className="mt-2 text-left text-2xl font-semibold tracking-0">
                  {capturing ? t("timeSpace.savingMoment") : t("timeSpace.captureMoment")}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper">
                <Plus className="h-6 w-6" />
              </span>
            </button>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {momentDimensions.map((dimension) => (
                <div key={dimension.label} className="rounded-[18px] bg-white/10 px-4 py-3 backdrop-blur-xl">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/38">{dimension.label}</p>
                  <p className="mt-1 truncate text-sm text-white/72">{dimension.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <p className="text-sm font-semibold text-white/82">{t("timeSpace.todayMemory", { count: currentJourneyDay.memories.length })}</p>
              <p className="mt-2 text-sm text-white/58">
                {todayEvent ? `${todayEvent.time ?? ""} ${todayEvent.title}` : t("timeSpace.nowHint")}
              </p>
            </div>
            <div className="mt-6">
              <SpaceAxis place={currentDay.routeLabel ?? currentDay.city} tone="light" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative h-[100svh] w-screen shrink-0 snap-center overflow-hidden bg-[#edf2f0] text-paper">
        <TimeAxis active="journey" />
        <img src={fallbackJourneyImage} alt={t("timeSpace.journeyAlt")} className="absolute inset-0 h-full w-full object-cover opacity-78" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,49,61,.36),rgba(13,21,24,.88))]" />
        <div className="relative z-10 flex h-full flex-col px-5 py-7">
          <p className="mt-12 text-sm text-white/62">{t("timeSpace.journeySubtitle")}</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-0">{t("timeSpace.journey")}</h1>

          <div className="relative mt-10 flex-1 overflow-y-auto pb-20 pl-7">
            <div className="absolute bottom-0 left-[9px] top-2 border-l border-white/28" />
            <div className="grid gap-6">
              {futureDays.map((day) => {
                const journeyDay = journey.days.find((item) => item.id === day.id);
                const event = journeyDay ? firstTimedEvent(journeyDay) : undefined;
                return (
                  <Link key={day.id} href={`/day?day=${encodeURIComponent(day.id)}`} className="relative block">
                    <span className="absolute -left-[25px] top-2 h-3 w-3 rounded-full border border-white/78 bg-white/42" />
                    <p className="text-sm text-white/58">{formatDate(day.date)} · {day.city}</p>
                    <h2 className="mt-2 text-xl font-semibold leading-tight">{day.routeLabel ?? day.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/62">{event?.title ?? t("timeSpace.openFuture")}</p>
                  </Link>
                );
              })}

              <div className="relative rounded-[22px] bg-white/12 p-5 backdrop-blur-xl">
                <span className="absolute -left-[25px] top-7 h-3 w-3 rounded-full border border-white/68 bg-white/22" />
                <p className="text-sm text-white/62">{t("timeSpace.inspiration")}</p>
                <p className="mt-2 text-base font-semibold leading-7">{t("timeSpace.inspirationCopy")}</p>
              </div>
            </div>
          </div>

          <Link
            href={`/day?day=${encodeURIComponent(currentDay.id)}`}
            className="absolute bottom-7 left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-white/22 text-white shadow-soft backdrop-blur-xl"
            aria-label={t("timeSpace.openJourney")}
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
      </section>
    </div>
  );
}
