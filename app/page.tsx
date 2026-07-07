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
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1800&q=80"
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

function FlowingTimeScale({
  moments,
  focusIndex,
  locale
}: {
  moments: Array<{ tripDay: TripDay }>;
  focusIndex: number;
  locale: Locale;
}) {
  const positions = [
    { left: 2, top: 55 },
    { left: 17, top: 33 },
    { left: 34, top: 62 },
    { left: 50, top: 28 },
    { left: 66, top: 56 },
    { left: 83, top: 35 },
    { left: 98, top: 52 }
  ];
  const slots = [-3, -2, -1, 0, 1, 2, 3].map((offset, index) => ({
    offset,
    position: positions[index],
    day: moments[focusIndex + offset]?.tripDay
  }));

  return (
    <div className="pointer-events-none mx-auto h-32 max-w-[38rem] px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <p className="text-center text-[10px] text-white/34">{monthLabel(moments[focusIndex].tripDay.date, locale)}</p>
      <div className="relative mt-1 h-24">
        <svg className="absolute inset-x-[-10%] top-0 h-full w-[120%]" viewBox="0 0 420 96" fill="none" aria-hidden="true">
          <path
            className="journey-river"
            d="M4 56 C42 12 92 88 139 44 C184 3 226 88 272 45 C318 5 361 81 416 30"
            stroke="rgba(255,255,255,.28)"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeDasharray="1 10"
          />
          <path
            d="M10 67 C58 34 90 74 132 55 C184 31 214 71 260 52 C316 28 358 55 410 43"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </svg>

        {slots.map(({ day, offset, position }) => (
          <div
            key={offset}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${position.left}%`, top: position.top }}
          >
            {day ? (
              <>
                <span
                  className={[
                    "mx-auto block rounded-full",
                    offset === 0
                      ? "h-3 w-3 bg-white shadow-[0_0_22px_rgba(255,255,255,.72)]"
                      : "h-1.5 w-1.5 bg-white/36"
                  ].join(" ")}
                />
                <span
                  className={[
                    "mt-2 block whitespace-nowrap font-serif",
                    offset === 0 ? "text-[28px] leading-none text-white" : "text-[11px] text-white/36"
                  ].join(" ")}
                >
                  {offset === 0 ? shortDate(day.date).replace(".", "·") : shortDate(day.date)}
                </span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SpatialCurrent({ place, index }: { place: string; index: number }) {
  const lift = 14 + (index % 5) * 7;
  return (
    <div className="relative mt-8 h-28 text-white/70">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 112" fill="none" aria-hidden="true">
        <path
          className="journey-river-slow"
          d={`M4 ${78 - (index % 3) * 4} C 58 ${30 + (index % 2) * 8}, 108 ${98 - lift / 2}, 172 58 S 282 ${18 + (index % 4) * 8}, 356 54`}
          stroke="rgba(255,255,255,.22)"
          strokeWidth="1"
          strokeDasharray="2 12"
          strokeLinecap="round"
        />
        <path
          d="M30 90 C 96 64, 139 72, 191 50 S 292 35, 338 70"
          stroke="rgba(255,255,255,.10)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <circle cx={172 + (index % 3) * 14} cy={58 - (index % 2) * 8} r="4.5" fill="rgba(255,255,255,.82)" />
        <circle cx={172 + (index % 3) * 14} cy={58 - (index % 2) * 8} r="16" stroke="rgba(255,255,255,.12)" />
      </svg>
      <p className="absolute bottom-4 right-0 max-w-[78%] text-right text-sm text-white/72">{place}</p>
    </div>
  );
}

function FragmentStream({
  title,
  items
}: {
  title: string;
  items: TripDay["schedule"];
}) {
  return (
    <section className="relative py-10">
      <p className="mb-7 font-serif text-2xl text-white/30">{title}</p>
      <svg className="absolute bottom-0 left-3 top-16 w-10" viewBox="0 0 40 260" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M20 0 C3 46 35 89 17 132 C1 172 33 207 18 260" stroke="rgba(255,255,255,.13)" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div className="space-y-9">
        {items.slice(0, 4).map((item, index) => (
          <div key={item.id} className="relative pl-12 text-white/68">
            <span className="absolute left-[14px] top-2 h-2 w-2 rounded-full bg-white/38 shadow-[0_0_18px_rgba(255,255,255,.24)]" />
            <p className="text-xs text-white/38">{item.time || "--:--"}</p>
            <p className="mt-1 text-xl font-semibold leading-snug text-white/78">{item.title}</p>
            {item.location ? <p className="mt-1 text-sm text-white/40">{item.location}</p> : null}
            {index < items.length - 1 ? <span className="mt-5 block h-px w-24 bg-gradient-to-r from-white/14 to-transparent" /> : null}
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

  React.useEffect(() => {
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    panel.scrollTop = Math.max(0, anchor.offsetTop - Math.round(panel.clientHeight * 0.08));
  }, []);

  return (
    <section
      ref={panelRef}
      className="relative h-[100dvh] w-screen shrink-0 snap-center overflow-y-auto overflow-x-hidden bg-[#0f110d] text-white"
      aria-label={line}
    >
      <div className="sticky top-0 z-0 h-[100dvh] overflow-hidden">
        <img src={image} alt={photos[0]?.caption ?? t("timeFlow.imageAlt")} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_28%,rgba(255,255,255,.12),transparent_26%),linear-gradient(180deg,rgba(8,10,8,.18),rgba(8,10,8,.36)_42%,rgba(8,10,8,.88))]" />
        <div className="absolute inset-x-0 top-0 z-20">
          <FlowingTimeScale moments={moments} focusIndex={index} locale={locale} />
        </div>
      </div>

      <div className="relative z-10 -mt-[100dvh] min-h-[205dvh] px-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <div className="mx-auto max-w-[34rem] pt-[calc(env(safe-area-inset-top)+9rem)]">
          <FragmentStream title={t("timeFlow.before")} items={fragments.early} />

          <div ref={anchorRef} className="flex min-h-[100dvh] flex-col justify-end pb-[14dvh] pt-12">
            <div className="max-w-[34rem]">
              <div className="mb-5 flex items-center justify-between gap-4 text-xs text-white/66">
                <span className="font-serif text-lg text-white/78">{fullDate(tripDay.date)}</span>
                <span>{isCurrent ? clock || "--:--" : localizedWeather(tripDay, locale, t("timeFlow.weatherFallback"))}</span>
              </div>

              <h1 className="max-w-[21rem] font-serif text-[3.25rem] font-semibold leading-[1.03] text-white drop-shadow-[0_18px_46px_rgba(0,0,0,.36)] sm:max-w-[30rem] sm:text-7xl">
                {line}
              </h1>

              <div className="mt-7 space-y-3 text-white/76">
                <p className="flex items-start gap-2 text-base leading-relaxed">
                  <MapPin className="mt-1 h-4 w-4 shrink-0" />
                  <span>{place}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-white/58">
                  <CloudSun className="h-4 w-4" />
                  <span>{photos.length ? t("timeFlow.photos", { count: photos.length }) : t("timeFlow.waitingPhoto")}</span>
                </p>
              </div>

              <SpatialCurrent place={place} index={index} />

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
                    className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.75rem)] right-6 z-40 grid h-16 w-16 place-items-center rounded-full bg-white/92 text-[#151711] shadow-[0_18px_52px_rgba(0,0,0,.3)] backdrop-blur-xl transition active:scale-95"
                  >
                    {capturing ? <span className="h-2 w-2 animate-ping rounded-full bg-black" /> : <Plus className="h-8 w-8" />}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <FragmentStream title={t("timeFlow.after")} items={fragments.late} />

          <section className="py-12 text-white/72">
            <p className="font-serif text-2xl text-white/32">{t("timeFlow.memoryMatter")}</p>
            <p className="mt-5 max-w-[28rem] text-2xl font-semibold leading-relaxed text-white/80">{line}</p>
          </section>
        </div>
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
      <div className="min-h-[100dvh] bg-[#0f110d] p-4">
        <div className="h-[92dvh] animate-pulse bg-white/8" />
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
    <main aria-label={t("timeFlow.aria")} className="h-[100dvh] overflow-hidden bg-[#0f110d] text-white">
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
