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

function TimeScale({ dates, currentDate, tone = "light" }: { dates: string[]; currentDate: string; tone?: "dark" | "light" }) {
  const currentIndex = Math.max(0, dates.findIndex((date) => date === currentDate));
  const start = Math.max(0, Math.min(currentIndex - 2, Math.max(0, dates.length - 5)));
  const visibleDates = dates.slice(start, start + 5);
  const isLight = tone === "light";

  return (
    <div className="pointer-events-none absolute left-6 right-6 top-[calc(env(safe-area-inset-top)+1.25rem)] z-20">
      <div className="flex items-center justify-between">
        {visibleDates.map((date) => {
          const active = date === currentDate;
          return (
            <span
              key={date}
              className={`text-[10px] tracking-[0.12em] ${
                active ? (isLight ? "text-white/86" : "text-black/72") : isLight ? "text-white/38" : "text-black/32"
              }`}
            >
              {date.slice(5).replace("-", "/")}
            </span>
          );
        })}
      </div>
      <div className={`relative mt-3 h-4 border-t ${isLight ? "border-white/24" : "border-black/12"}`}>
        <div className="absolute inset-x-0 top-[-5px] flex items-center justify-between">
          {visibleDates.map((date) => {
            const active = date === currentDate;
            return (
              <span
                key={date}
                className={`rounded-full ${
                  active
                    ? isLight
                      ? "h-2.5 w-2.5 bg-white"
                      : "h-2.5 w-2.5 bg-black/72"
                    : isLight
                      ? "h-1.5 w-1.5 bg-white/32"
                      : "h-1.5 w-1.5 bg-black/22"
                }`}
              />
            );
          })}
        </div>
      </div>
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

function JourneyMap({ place }: { place: string }) {
  const { t } = useI18n();

  return (
    <div className="pointer-events-none mt-5 overflow-hidden rounded-[22px] bg-white/[0.075] px-4 py-4 backdrop-blur-xl">
      <div className="relative h-[74px]">
        <svg className="absolute inset-x-0 top-3 h-12 w-full" viewBox="0 0 320 48" fill="none" aria-hidden="true">
          <path
            d="M10 31 C58 6 88 41 126 24 C162 8 183 8 216 25 C251 43 279 35 310 13"
            stroke="rgba(255,255,255,.38)"
            strokeWidth="1.5"
            strokeDasharray="3 7"
            strokeLinecap="round"
          />
          <circle cx="10" cy="31" r="3.5" fill="rgba(255,255,255,.42)" />
          <circle cx="160" cy="15" r="5.5" fill="rgba(255,255,255,.88)" />
          <circle cx="310" cy="13" r="3.5" fill="rgba(255,255,255,.42)" />
        </svg>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between text-[10px] tracking-[0.16em] text-white/42">
          <span>{t("timeSpace.mapPast")}</span>
          <span className="text-white/82">{t("timeSpace.mapMe")}</span>
          <span>{t("timeSpace.mapFuture")}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="truncate text-xs text-white/64">{place}</p>
        </div>
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

function isEnglishSampleLine(value?: string) {
  if (!value) return false;
  const ascii = value.replace(/[^\x00-\x7F]/g, "");
  return ascii.length / value.length > 0.85 && value.length > 24;
}

function localWeatherLabel(description: string | undefined, highC: number | undefined, locale: string, fallback: string) {
  if (!description) return fallback;
  if (locale !== "zh-CN") {
    return `${description}${highC ? ` · ${highC}°C` : ""}`;
  }
  const descriptionMap = [
    { key: "Desert heat", value: "沙漠热浪" },
    { key: "Dry sun", value: "干燥晴朗" },
    { key: "Humid heat", value: "湿热" },
    { key: "Mountain night", value: "山间凉意" },
    { key: "Coastal", value: "海岸天气" }
  ];
  const matched = descriptionMap.find((item) => description.includes(item.key));
  return `${matched?.value ?? "天气在路上"}${highC ? ` · ${highC}°C` : ""}`;
}

export default function TodayPage() {
  const { journey, trip, loading, captureMoment } = useJourney();
  const { t, formatDate, locale } = useI18n();
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
  const journeyDates = trip.days.map((day) => day.date);
  const rawMemoryLine = todayMemory?.content?.trim();
  const memoryLine = locale === "zh-CN" && isEnglishSampleLine(rawMemoryLine) ? t("today.prototypeLine") : rawMemoryLine || t("today.prototypeLine");
  const todayEvent = firstTimedEvent(currentJourneyDay);
  const placeLine = currentDay.city;
  const weatherLine = localWeatherLabel(currentDay.weather?.description, currentDay.weather?.highC, locale, t("timeSpace.nowWeather"));

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
      className="no-scrollbar flex h-[100dvh] min-h-[100svh] snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-[#f7f4ed] text-ink"
      aria-label={t("timeSpace.aria")}
    >
      <section className="relative h-[100dvh] min-h-[100svh] w-screen shrink-0 snap-center overflow-y-auto bg-[#f6f1e9] px-5 py-7">
        <TimeScale dates={journeyDates} currentDate={currentDay.date} tone="dark" />
        <div className="mx-auto flex min-h-full max-w-md flex-col">
          <div className="grid gap-4 pb-8 pt-[calc(env(safe-area-inset-top)+5.75rem)]">
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

      <section className="relative h-[100dvh] min-h-[100svh] w-screen shrink-0 snap-center overflow-y-auto bg-ink text-paper">
        <TimeScale dates={journeyDates} currentDate={currentDay.date} />
        <img src={heroImage} alt={todayPhotos[0]?.caption ?? t("today.heroAlt")} className="absolute inset-0 h-full w-full object-cover opacity-82" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,18,15,.2),rgba(15,18,15,.36)_36%,rgba(15,18,15,.88))]" />
        <div className="relative z-10 flex min-h-full flex-col justify-end px-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-[calc(env(safe-area-inset-top)+5.5rem)] sm:pb-8">
          <div>
            <div>
              <h2 className="max-w-[21rem] text-3xl font-semibold leading-tight tracking-0 sm:text-4xl">{memoryLine}</h2>
              <div className="mt-5 grid gap-2 text-sm text-white/76">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {placeLine}
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
              className="mt-7 flex min-h-20 w-full items-center justify-between rounded-[24px] bg-[#f7f0e6] p-5 text-[#171512] shadow-story"
            >
              <div>
                <p className="text-sm text-black/52">{t("timeSpace.nowQuestion")}</p>
                <p className="mt-1 text-left text-xl font-semibold tracking-0">
                  {capturing ? t("timeSpace.savingMoment") : t("timeSpace.captureMoment")}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper">
                <Plus className="h-6 w-6" />
              </span>
            </button>

            <JourneyMap place={currentDay.routeLabel ?? currentDay.city} />

            <div className="mt-5 hidden sm:block">
              <p className="text-sm font-semibold text-white/82">{t("timeSpace.todayMemory", { count: currentJourneyDay.memories.length })}</p>
              <p className="mt-2 text-sm text-white/58">
                {todayEvent ? `${todayEvent.time ?? ""} ${todayEvent.title}` : t("timeSpace.nowHint")}
              </p>
            </div>
            <div className="mt-6 hidden sm:block">
              <SpaceAxis place={currentDay.routeLabel ?? currentDay.city} tone="light" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative h-[100dvh] min-h-[100svh] w-screen shrink-0 snap-center overflow-hidden bg-[#edf2f0] text-paper">
        <TimeScale dates={journeyDates} currentDate={currentDay.date} />
        <img src={fallbackJourneyImage} alt={t("timeSpace.journeyAlt")} className="absolute inset-0 h-full w-full object-cover opacity-78" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,49,61,.36),rgba(13,21,24,.88))]" />
        <div className="relative z-10 flex h-full flex-col px-5 py-7">
          <div className="relative mt-[calc(env(safe-area-inset-top)+5.75rem)] flex-1 overflow-y-auto pb-20 pl-7">
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
