"use client";

import * as React from "react";
import { CloudSun, MapPin, Plus } from "lucide-react";
import { useJourney } from "@/components/journey-provider";
import { getCurrentJourneyDay } from "@/lib/engines/journey-engine";
import { primaryMemory } from "@/lib/engines/memory-engine";
import { JourneyDay as DomainDay } from "@/lib/domain";
import { JourneyDay as TripDay } from "@/lib/schema";
import { Locale, useI18n } from "@/lib/i18n";

const fallbackImages = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80"
];

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function currentClock(locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function isEnglishSampleLine(value?: string) {
  if (!value) return false;
  const ascii = value.replace(/[^\x00-\x7F]/g, "");
  return ascii.length / value.length > 0.85 && value.length > 24;
}

function dayKey(dayNumber: number) {
  return `day_${String(dayNumber).padStart(2, "0")}`;
}

function shortDate(value: string) {
  return value.slice(5).replace("-", ".");
}

function fullDate(value: string) {
  return value.replaceAll("-", ".");
}

function quietPlace(day: TripDay) {
  return (day.city || day.route?.end || day.route?.start || day.title).replace(/\s*->\s*/g, " · ").replace(/\s*\/\s*/g, " · ");
}

function monthLabel(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function localizedWeather(day: TripDay, locale: Locale, fallback: string) {
  const description = day.weather?.description;
  const highC = day.weather?.highC;
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
  return `${matched?.value ?? fallback}${highC ? ` · ${highC}°C` : ""}`;
}

function momentLine(input: {
  day: DomainDay;
  tripDay: TripDay;
  locale: Locale;
  isAhead: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const raw = primaryMemory(input.day)?.content?.trim();
  if (raw && !(input.locale === "zh-CN" && isEnglishSampleLine(raw))) return raw;

  const key = `timeFlow.lines.${dayKey(input.tripDay.dayNumber)}`;
  const localized = input.t(key);
  if (localized !== key) return localized;

  return input.isAhead ? input.t("timeFlow.defaultAhead") : input.t("timeFlow.defaultKept");
}

function timeMinutes(value?: string) {
  if (!value) return 12 * 60;
  const [hour = "12", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function splitFragments(day: TripDay) {
  const sorted = [...day.schedule].sort((a, b) => timeMinutes(a.time) - timeMinutes(b.time));
  const early = sorted.filter((item) => timeMinutes(item.time) < 13 * 60);
  const late = sorted.filter((item) => timeMinutes(item.time) >= 13 * 60);

  return {
    early: early.length ? early : sorted.slice(0, 2),
    late: late.length ? late : sorted.slice(-3)
  };
}

function TimeScale({
  moments,
  activeIndex,
  locale
}: {
  moments: Array<{ tripDay: TripDay }>;
  activeIndex: number;
  locale: Locale;
}) {
  const slots = [-3, -2, -1, 0, 1, 2, 3].map((offset) => ({
    offset,
    day: moments[activeIndex + offset]?.tripDay
  }));

  return (
    <div className="pointer-events-none mx-auto max-w-[34rem] px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <p className="mb-3 text-center text-[10px] text-white/38">{monthLabel(moments[activeIndex].tripDay.date, locale)}</p>
      <div className="relative h-10">
        <span className="absolute left-0 right-0 top-5 h-px bg-white/18" />
        <div className="grid grid-cols-7">
          {slots.map(({ day, offset }) => (
            <div key={offset} className="relative flex flex-col items-center">
              <span
                className={[
                  "mt-[17px] rounded-full",
                  offset === 0
                    ? "h-2.5 w-2.5 bg-white shadow-[0_0_0_7px_rgba(255,255,255,.09)]"
                    : day
                      ? "h-1.5 w-1.5 bg-white/34"
                      : "h-1.5 w-1.5 bg-transparent"
                ].join(" ")}
              />
              <span className={offset === 0 ? "mt-3 text-[11px] text-white/84" : "mt-3 text-[10px] text-white/34"}>
                {day ? shortDate(day.date) : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpatialImprint({ place, index, strong = false }: { place: string; index: number; strong?: boolean }) {
  const dotX = 68 + (index % 5) * 9;
  const lift = 16 + (index % 4) * 7;

  return (
    <div className={strong ? "text-white/68" : "text-white/44"}>
      <div className="relative h-[66px] overflow-hidden rounded-[25px] border border-white/8 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 66" fill="none" aria-hidden="true">
          <path
            d={`M8 ${49 - (index % 3) * 5} C 70 ${18 + (index % 2) * 8}, 118 ${58 - lift / 2}, 170 ${36} S 252 ${22 + (index % 3) * 5}, 312 ${40}`}
            stroke={strong ? "rgba(255,255,255,.23)" : "rgba(255,255,255,.14)"}
            strokeWidth="1"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
          <circle cx={dotX * 2.05} cy={lift + 15} r={strong ? "5.5" : "4"} fill="rgba(255,255,255,.72)" />
          <circle cx={dotX * 2.05} cy={lift + 15} r={strong ? "15" : "11"} stroke="rgba(255,255,255,.12)" />
          <circle cx={dotX * 1.05} cy={47 - (index % 2) * 10} r="2" fill="rgba(255,255,255,.16)" />
          <circle cx={286 - (index % 3) * 24} cy={26 + (index % 2) * 14} r="2.5" fill="rgba(255,255,255,.12)" />
        </svg>
        <p className="absolute bottom-3 right-4 max-w-[76%] truncate text-right text-xs">{place}</p>
      </div>
    </div>
  );
}

function FragmentList({
  title,
  items
}: {
  title: string;
  items: TripDay["schedule"];
}) {
  return (
    <section className="space-y-3">
      <p className="text-xs text-white/36">{title}</p>
      <div className="space-y-2">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="rounded-[22px] border border-white/8 bg-white/[0.045] px-4 py-3 text-white/72 backdrop-blur-xl">
            <p className="text-[11px] text-white/38">{item.time || "--:--"}</p>
            <p className="mt-1 text-base font-semibold leading-snug text-white/82">{item.title}</p>
            {item.location ? <p className="mt-1 text-xs text-white/38">{item.location}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function MomentScreen({
  day,
  tripDay,
  index,
  activeIndex,
  moments,
  isCurrent,
  locale,
  clock,
  captureInputRef,
  capturing,
  onCapture,
  t
}: {
  day: DomainDay;
  tripDay: TripDay;
  index: number;
  activeIndex: number;
  moments: Array<{ day: DomainDay; tripDay: TripDay }>;
  isCurrent: boolean;
  locale: Locale;
  clock: string;
  captureInputRef: React.RefObject<HTMLInputElement | null>;
  capturing: boolean;
  onCapture: (dayId: string, files?: FileList | null) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const panelRef = React.useRef<HTMLElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const photos = tripDay.photos ?? [];
  const image = photos[0]?.localUrl ?? fallbackImages[index % fallbackImages.length];
  const place = quietPlace(tripDay);
  const line = momentLine({ day, tripDay, locale, isAhead: index > activeIndex, t });
  const fragments = splitFragments(tripDay);
  const activeScaleIndex = Math.max(0, Math.min(index, moments.length - 1));

  React.useEffect(() => {
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const target = anchor.offsetTop - Math.round(panel.clientHeight * 0.1);
    panel.scrollTop = Math.max(0, target);
  }, []);

  return (
    <section
      ref={panelRef}
      className="h-[100dvh] w-screen shrink-0 snap-center overflow-y-auto overflow-x-hidden bg-[#11130f] text-white"
      aria-label={line}
    >
      <div className="sticky top-0 z-30 bg-gradient-to-b from-[#11130f] via-[#11130f]/88 to-transparent pb-8">
        <TimeScale moments={moments} activeIndex={activeScaleIndex} locale={locale} />
      </div>

      <div className="mx-auto max-w-[34rem] space-y-7 px-5 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
        <FragmentList title={t("timeFlow.before")} items={fragments.early} />

        <div ref={anchorRef} className="min-h-[calc(100dvh-8rem)] py-2">
          <article className="story-grain relative min-h-[67dvh] overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] shadow-[0_30px_100px_rgba(0,0,0,.36)]">
            <img src={image} alt={photos[0]?.caption ?? t("timeFlow.imageAlt")} className="absolute inset-0 h-full w-full object-cover opacity-82" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,15,12,.10),rgba(14,15,12,.35)_38%,rgba(14,15,12,.9))]" />
            <div className="relative z-10 flex min-h-[67dvh] flex-col justify-end px-5 pb-5 pt-28">
              <div className="mb-5 flex items-center justify-between gap-3 text-xs text-white/58">
                <span>{fullDate(tripDay.date)}</span>
                <span>{isCurrent ? clock || "--:--" : localizedWeather(tripDay, locale, t("timeFlow.weatherFallback"))}</span>
              </div>
              <h1 className="text-4xl font-semibold leading-[1.07] text-white">{line}</h1>
              <div className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-white/75">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{place}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                <CloudSun className="h-4 w-4" />
                <span>{photos.length ? t("timeFlow.photos", { count: photos.length }) : t("timeFlow.waitingPhoto")}</span>
              </div>
              {isCurrent ? (
                <>
                  <input
                    ref={captureInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => void onCapture(tripDay.id, event.currentTarget.files)}
                  />
                  <button
                    type="button"
                    aria-label={t("timeFlow.captureAria")}
                    title={t("timeFlow.capture")}
                    onClick={() => captureInputRef.current?.click()}
                    className="absolute bottom-5 right-5 grid h-16 w-16 place-items-center rounded-full bg-white text-[#171912] shadow-[0_18px_42px_rgba(0,0,0,.28)] transition active:scale-95"
                  >
                    {capturing ? <span className="h-2 w-2 animate-ping rounded-full bg-black" /> : <Plus className="h-8 w-8" />}
                  </button>
                </>
              ) : null}
            </div>
          </article>
          <div className="mt-4">
            <SpatialImprint place={place} index={index} strong />
          </div>
        </div>

        <FragmentList title={t("timeFlow.after")} items={fragments.late} />

        <section className="rounded-[28px] border border-white/8 bg-white/[0.045] p-5 text-white/70 backdrop-blur-xl">
          <p className="text-xs text-white/36">{t("timeFlow.memoryMatter")}</p>
          <p className="mt-3 text-lg font-semibold leading-relaxed text-white/82">{line}</p>
        </section>
      </div>
    </section>
  );
}

export default function JourneyFlowPage() {
  const { journey, trip, loading, captureMoment } = useJourney();
  const { t, locale } = useI18n();
  const stripRef = React.useRef<HTMLDivElement>(null);
  const captureInputRef = React.useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = React.useState(false);
  const [clock, setClock] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const currentIso = todayIso();
  const currentJourneyDay = journey ? getCurrentJourneyDay(journey, currentIso) : null;
  const currentTripDay = trip?.days.find((day) => day.id === currentJourneyDay?.id) ?? trip?.days.at(-1) ?? null;

  const moments = React.useMemo(() => {
    if (!journey || !trip) return [];
    return journey.days
      .map((day) => ({
        day,
        tripDay: trip.days.find((item) => item.id === day.id)
      }))
      .filter((item): item is { day: DomainDay; tripDay: TripDay } => Boolean(item.tripDay))
      .sort((a, b) => a.tripDay.date.localeCompare(b.tripDay.date));
  }, [journey, trip]);

  const currentIndex = Math.max(0, moments.findIndex(({ tripDay }) => tripDay.id === currentTripDay?.id));

  React.useEffect(() => {
    const updateClock = () => setClock(currentClock(locale));
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, [locale]);

  React.useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !moments.length) return;
    strip.scrollLeft = currentIndex * strip.clientWidth;
    setActiveIndex(currentIndex);
  }, [currentIndex, moments.length]);

  React.useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    let frame = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextIndex = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
        setActiveIndex(Math.max(0, Math.min(moments.length - 1, nextIndex)));
      });
    };

    strip.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      strip.removeEventListener("scroll", onScroll);
    };
  }, [moments.length]);

  if (loading || !journey || !trip || !currentTripDay || !currentJourneyDay || !moments.length) {
    return (
      <div className="min-h-[100dvh] bg-[#11130f] p-4">
        <div className="h-[92dvh] animate-pulse rounded-[32px] bg-white/8" />
      </div>
    );
  }

  async function handleCapture(dayId: string, files?: FileList | null) {
    if (!files?.length) return;
    setCapturing(true);
    try {
      await captureMoment(dayId, files, t("timeFlow.autoMomentLine"));
    } finally {
      setCapturing(false);
      if (captureInputRef.current) {
        captureInputRef.current.value = "";
      }
    }
  }

  return (
    <main aria-label={t("timeFlow.aria")} className="h-[100dvh] overflow-hidden bg-[#11130f] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(174,147,103,.18),transparent_38%),linear-gradient(180deg,#151711_0%,#0e100d_62%,#17140f_100%)]" />
      <div
        ref={stripRef}
        className="no-scrollbar relative z-10 flex h-[100dvh] snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        {moments.map(({ day, tripDay }, index) => (
          <MomentScreen
            key={tripDay.id}
            day={day}
            tripDay={tripDay}
            index={index}
            activeIndex={activeIndex}
            moments={moments}
            isCurrent={tripDay.id === currentTripDay.id}
            locale={locale}
            clock={clock}
            captureInputRef={captureInputRef}
            capturing={capturing}
            onCapture={handleCapture}
            t={t}
          />
        ))}
      </div>
    </main>
  );
}
