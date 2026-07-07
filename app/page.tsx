"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, Check, CloudSun, Image as ImageIcon, MapPin, Plus, X } from "lucide-react";
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

type TimePhase = "memory" | "now" | "future";

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

function memoryNotes(day: TripDay) {
  return (day.notes ?? []).filter((note) => note.type === "memory");
}

function formatNoteTime(value: string, locale: Locale) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function timePhase(date: string, currentIso: string): TimePhase {
  if (date > currentIso) return "future";
  if (date === currentIso) return "now";
  return "memory";
}

function futureJourneyLine(day: TripDay, t: (key: string, params?: Record<string, string | number>) => string) {
  const route = day.routeLabel || [day.route?.start, day.route?.end].filter(Boolean).join(" → ");
  const firstPlan = day.schedule.find((item) => item.title)?.title;
  return route || firstPlan || day.title || t("timeFlow.futureDefault");
}

function momentLine(input: {
  day: DomainDay;
  tripDay: TripDay;
  locale: Locale;
  phase: TimePhase;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (input.phase === "future") {
    return futureJourneyLine(input.tripDay, input.t);
  }

  const raw = primaryMemory(input.day)?.content?.trim();
  if (raw && !(input.locale === "zh-CN" && isEnglishSampleLine(raw))) return raw;

  const key = `timeFlow.lines.${dayKey(input.tripDay.dayNumber)}`;
  const localized = input.t(key);
  if (localized !== key) return localized;

  return input.t("timeFlow.defaultKept");
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
      <p className="text-center text-[10px] text-white/[0.34]">{monthLabel(moments[focusIndex].tripDay.date, locale)}</p>
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
                      : "h-1.5 w-1.5 bg-white/[0.36]"
                  ].join(" ")}
                />
                <span
                  className={[
                    "mt-2 block whitespace-nowrap font-serif",
                    offset === 0 ? "text-[28px] leading-none text-white" : "text-[11px] text-white/[0.36]"
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
    <div className="relative mt-8 h-28 text-white/[0.70]">
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
      <p className="absolute bottom-4 right-0 max-w-[78%] text-right text-sm text-white/[0.72]">{place}</p>
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
      <p className="mb-7 font-serif text-2xl text-white/[0.30]">{title}</p>
      <svg className="absolute bottom-0 left-3 top-16 w-10" viewBox="0 0 40 260" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M20 0 C3 46 35 89 17 132 C1 172 33 207 18 260" stroke="rgba(255,255,255,.13)" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div className="space-y-9">
        {items.slice(0, 4).map((item, index) => (
          <div key={item.id} className="relative pl-12 text-white/[0.68]">
            <span className="absolute left-[14px] top-2 h-2 w-2 rounded-full bg-white/[0.38] shadow-[0_0_18px_rgba(255,255,255,.24)]" />
            <p className="text-xs text-white/[0.38]">{item.time || "--:--"}</p>
            <p className="mt-1 text-xl font-semibold leading-snug text-white/[0.78]">{item.title}</p>
            {item.location ? <p className="mt-1 text-sm text-white/[0.40]">{item.location}</p> : null}
            {index < items.length - 1 ? <span className="mt-5 block h-px w-24 bg-gradient-to-r from-white/[0.14] to-transparent" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function MomentCaptureSheet({
  open,
  draftText,
  selectedCount,
  saving,
  onDraftTextChange,
  onPickPhotos,
  onSave,
  onClose,
  t
}: {
  open: boolean;
  draftText: string;
  selectedCount: number;
  saving: boolean;
  onDraftTextChange: (value: string) => void;
  onPickPhotos: () => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!open) return null;

  const canSave = Boolean(draftText.trim()) || selectedCount > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/[0.42] backdrop-blur-md" role="dialog" aria-modal="true" aria-label={t("timeFlow.captureTitle")}>
      <form
        className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-[#f7f1e6] px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 text-[#151711] shadow-[0_-24px_70px_rgba(0,0,0,.36)]"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/[0.16]" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-serif text-3xl font-semibold">{t("timeFlow.captureTitle")}</p>
            <p className="mt-2 max-w-[19rem] text-sm leading-relaxed text-black/[0.56]">{t("timeFlow.captureHelp")}</p>
          </div>
          <button
            type="button"
            aria-label={t("timeFlow.close")}
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.06] text-black/[0.56] transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <textarea
          value={draftText}
          onChange={(event) => onDraftTextChange(event.currentTarget.value)}
          placeholder={t("timeFlow.capturePlaceholder")}
          className="mt-7 min-h-32 w-full resize-none rounded-none border-0 border-b border-black/[0.18] bg-transparent px-0 py-3 text-2xl leading-relaxed text-black outline-none placeholder:text-black/[0.32]"
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPickPhotos}
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.07] px-4 py-3 text-sm font-semibold text-black/[0.68] transition active:scale-95"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{selectedCount ? t("timeFlow.selectedPhotos", { count: selectedCount }) : t("timeFlow.addPhoto")}</span>
          </button>
          <button
            type="submit"
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#151711] px-5 py-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-35"
          >
            <Camera className="h-4 w-4" />
            <span>{saving ? t("timeFlow.saving") : t("timeFlow.saveLocal")}</span>
          </button>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-black/[0.42]">{t("timeFlow.localOnly")}</p>
      </form>
    </div>
  );
}

function SavedMomentSheet({
  open,
  day,
  phase,
  locale,
  setLocale,
  onClose,
  t
}: {
  open: boolean;
  day: TripDay | null;
  phase: TimePhase;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!open || !day) return null;

  const isFuture = phase === "future";
  const memories = memoryNotes(day);
  const photos = day.photos ?? [];
  const hasSavedContent = isFuture ? day.schedule.length > 0 || Boolean(day.hotel) : memories.length > 0 || photos.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/[0.42] backdrop-blur-md" role="dialog" aria-modal="true" aria-label={isFuture ? t("timeFlow.futureTitle") : t("timeFlow.savedTitle")}>
      <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[2rem] bg-[#f7f1e6] px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 text-[#151711] shadow-[0_-24px_70px_rgba(0,0,0,.36)]">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/[0.16]" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-serif text-3xl font-semibold">{isFuture ? t("timeFlow.futureTitle") : t("timeFlow.savedTitle")}</p>
            <p className="mt-2 text-sm text-black/[0.56]">
              {isFuture ? t("timeFlow.futureStats", { count: day.schedule.length }) : t("timeFlow.savedStats", { memories: memories.length, photos: photos.length })}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("timeFlow.close")}
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.06] text-black/[0.56] transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 border-y border-black/[0.10] py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-black/[0.38]">{fullDate(day.date)} · {quietPlace(day)}</p>
          <p className="mt-2 text-sm leading-relaxed text-black/[0.56]">{isFuture ? t("timeFlow.futureBoundaryLine") : t("timeFlow.localStorageLine")}</p>
        </div>

        {isFuture ? (
          <div className="mt-6 space-y-5">
            <section className="rounded-[1.25rem] bg-black/[0.035] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-black/[0.34]">{t("timeFlow.variableSpace")}</p>
              <p className="mt-2 text-sm leading-relaxed text-black/[0.56]">{t("timeFlow.variableSpaceLine")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/journeys"
                  className="rounded-full bg-black/[0.08] px-4 py-2 text-sm font-semibold text-black/[0.66] transition active:scale-95"
                >
                  {t("timeFlow.manageJourney")}
                </Link>
                <Link
                  href="/journeys"
                  className="rounded-full bg-black/[0.08] px-4 py-2 text-sm font-semibold text-black/[0.66] transition active:scale-95"
                >
                  {t("timeFlow.importPlan")}
                </Link>
              </div>
            </section>

            <section className="rounded-[1.25rem] bg-black/[0.035] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-black/[0.34]">{t("settings.language")}</p>
              <div className="mt-4 grid gap-2">
                {[
                  { value: "zh-CN" as const, label: t("settings.chinese") },
                  { value: "en-US" as const, label: t("settings.english") }
                ].map((option) => {
                  const active = option.value === locale;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLocale(option.value)}
                      className={[
                        "flex h-12 items-center justify-between rounded-full px-4 text-sm font-semibold transition active:scale-[.98]",
                        active ? "bg-black/[0.82] text-white" : "bg-black/[0.06] text-black/[0.58]"
                      ].join(" ")}
                    >
                      <span>{option.label}</span>
                      {active ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {day.hotel ? (
              <article className="border-b border-black/[0.10] pb-5">
                <p className="text-xs text-black/[0.36]">{t("timeFlow.futurePlanned")}</p>
                <p className="mt-2 text-xl font-semibold leading-relaxed text-black/[0.82]">{day.hotel.name}</p>
                {day.hotel.address ? <p className="mt-1 text-sm text-black/[0.48]">{day.hotel.address}</p> : null}
              </article>
            ) : null}
            {day.schedule.slice(0, 8).map((item) => (
              <article key={item.id} className="border-b border-black/[0.10] pb-5 last:border-b-0">
                <p className="text-xs text-black/[0.36]">{item.time || t("timeFlow.futurePossible")}</p>
                <p className="mt-2 text-xl font-semibold leading-relaxed text-black/[0.82]">{item.title}</p>
                {item.location ? <p className="mt-1 text-sm text-black/[0.48]">{item.location}</p> : null}
                {item.notes ? <p className="mt-2 text-sm leading-relaxed text-black/[0.52]">{item.notes}</p> : null}
              </article>
            ))}
            {!hasSavedContent ? <p className="text-xl font-semibold leading-relaxed text-black/[0.64]">{t("timeFlow.noFuturePlan")}</p> : null}
          </div>
        ) : hasSavedContent ? (
          <div className="mt-6 space-y-6">
            {photos.length ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.slice(0, 6).map((photo) => (
                  <img key={photo.id} src={photo.localUrl} alt={photo.caption ?? t("timeFlow.imageAlt")} className="aspect-square w-full object-cover" />
                ))}
              </div>
            ) : null}

            {memories.length ? (
              <div className="space-y-5">
                {memories.slice().reverse().map((memory) => (
                  <article key={memory.id} className="border-b border-black/[0.10] pb-5 last:border-b-0">
                    <p className="text-xs text-black/[0.36]">{formatNoteTime(memory.createdAt, locale)}</p>
                    <p className="mt-2 text-xl font-semibold leading-relaxed text-black/[0.82]">{memory.content}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-8 text-xl font-semibold leading-relaxed text-black/[0.64]">{t("timeFlow.noSaved")}</p>
        )}
      </div>
    </div>
  );
}

function MomentScreen({
  day,
  tripDay,
  index,
  moments,
  phase,
  isTodayMoment,
  locale,
  clock,
  t
}: {
  day: DomainDay;
  tripDay: TripDay;
  index: number;
  moments: Array<{ day: DomainDay; tripDay: TripDay }>;
  phase: TimePhase;
  isTodayMoment: boolean;
  locale: Locale;
  clock: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const panelRef = React.useRef<HTMLElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const photos = tripDay.photos ?? [];
  const image = photos[0]?.localUrl ?? fallbackImages[index % fallbackImages.length];
  const place = quietPlace(tripDay);
  const line = momentLine({ day, tripDay, locale, phase, t });
  const fragments = splitFragments(tripDay);
  const isFuture = phase === "future";

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
              <div className="mb-5 flex items-center justify-between gap-4 text-xs text-white/[0.66]">
                <span className="font-serif text-lg text-white/[0.78]">{fullDate(tripDay.date)}</span>
                <span>{isTodayMoment ? clock || "--:--" : isFuture ? t("timeFlow.futureStatus") : localizedWeather(tripDay, locale, t("timeFlow.weatherFallback"))}</span>
              </div>

              <h1 className="max-w-[21rem] font-serif text-[3.25rem] font-semibold leading-[1.03] text-white drop-shadow-[0_18px_46px_rgba(0,0,0,.36)] sm:max-w-[30rem] sm:text-7xl">
                {line}
              </h1>

              <div className="mt-7 space-y-3 text-white/[0.76]">
                <p className="flex items-start gap-2 text-base leading-relaxed">
                  <MapPin className="mt-1 h-4 w-4 shrink-0" />
                  <span>{place}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-white/[0.58]">
                  <CloudSun className="h-4 w-4" />
                  <span>
                    {isFuture
                      ? t("timeFlow.futureItems", { count: tripDay.schedule.length })
                      : photos.length
                        ? t("timeFlow.photos", { count: photos.length })
                        : t("timeFlow.waitingPhoto")}
                  </span>
                </p>
              </div>

            </div>
          </div>

          <FragmentStream title={t("timeFlow.after")} items={fragments.late} />

          <section className="py-10">
            <p className="font-serif text-2xl text-white/[0.32]">{t("timeFlow.placeTrace")}</p>
            <SpatialCurrent place={place} index={index} />
          </section>

          <section className="py-12 text-white/[0.72]">
            <p className="font-serif text-2xl text-white/[0.32]">{t("timeFlow.memoryMatter")}</p>
            <p className="mt-5 max-w-[28rem] text-2xl font-semibold leading-relaxed text-white/[0.80]">{line}</p>
          </section>
        </div>
      </div>
    </section>
  );
}

export default function JourneyFlowPage() {
  const { journey, trip, loading, captureMoment } = useJourney();
  const { t, locale, setLocale } = useI18n();
  const capturePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const [capturing, setCapturing] = React.useState(false);
  const [clock, setClock] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [captureDayId, setCaptureDayId] = React.useState<string | null>(null);
  const [savedDayId, setSavedDayId] = React.useState<string | null>(null);
  const [draftText, setDraftText] = React.useState("");
  const [draftFiles, setDraftFiles] = React.useState<File[]>([]);

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
  const visibleActiveIndex = activeIndex ?? currentIndex;
  const captureTarget = moments.find(({ tripDay }) => tripDay.id === captureDayId)?.tripDay ?? null;
  const savedTarget = moments.find(({ tripDay }) => tripDay.id === savedDayId)?.tripDay ?? null;
  const savedTargetPhase = savedTarget ? timePhase(savedTarget.date, currentIso) : "memory";

  React.useEffect(() => {
    const updateClock = () => setClock(currentClock(locale));
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, [locale]);

  React.useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  if (loading || !journey || !trip || !currentTripDay || !currentJourneyDay || !moments.length) {
    return (
      <div className="min-h-[100dvh] bg-[#0f110d] p-4">
        <div className="h-[92dvh] animate-pulse bg-white/[0.08]" />
      </div>
    );
  }

  function openCapture(dayId: string) {
    const target = moments.find(({ tripDay }) => tripDay.id === dayId)?.tripDay;
    if (target && timePhase(target.date, currentIso) === "future") return;
    setCaptureDayId(dayId);
  }

  function closeCapture() {
    setCaptureDayId(null);
    setDraftFiles([]);
    setDraftText("");
    if (capturePhotoInputRef.current) {
      capturePhotoInputRef.current.value = "";
    }
  }

  async function handleCapture() {
    if (!captureTarget) return;
    if (timePhase(captureTarget.date, currentIso) === "future") return;
    if (!draftText.trim() && !draftFiles.length) return;

    setCapturing(true);
    try {
      await captureMoment(captureTarget.id, draftFiles, draftText.trim() || t("timeFlow.autoMomentLine"));
      closeCapture();
    } finally {
      setCapturing(false);
    }
  }

  function moveTime(nextIndex: number) {
    setActiveIndex(Math.max(0, Math.min(moments.length - 1, nextIndex)));
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

    moveTime(visibleActiveIndex + (dx < 0 ? 1 : -1));
  }

  const activeMoment = moments[visibleActiveIndex];
  const activeTripDay = activeMoment?.tripDay ?? currentTripDay;
  const activePhase = timePhase(activeTripDay.date, currentIso);

  return (
    <main
      aria-label={t("timeFlow.aria")}
      data-current-index={currentIndex}
      data-active-index={visibleActiveIndex}
      data-current-iso={currentIso}
      data-current-date={currentTripDay.date}
      className="h-[100dvh] overflow-hidden bg-[#0f110d] text-white"
    >
      <input
        ref={capturePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => setDraftFiles(Array.from(event.currentTarget.files ?? []))}
      />
      <div className="relative z-10 h-[100dvh] overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className="flex h-[100dvh] transition-transform duration-500 ease-out"
          style={{ transform: `translate3d(-${visibleActiveIndex * 100}vw, 0, 0)` }}
        >
        {moments.map(({ day, tripDay }, index) => (
          <MomentScreen
            key={tripDay.id}
            day={day}
            tripDay={tripDay}
            index={index}
            moments={moments}
            phase={timePhase(tripDay.date, currentIso)}
            isTodayMoment={tripDay.id === currentTripDay.id}
            locale={locale}
            clock={clock}
            t={t}
          />
        ))}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 flex items-center justify-center gap-3 px-5">
        {activePhase === "future" ? (
          <button
            type="button"
            onClick={() => setSavedDayId(activeTripDay.id)}
            className="inline-flex min-h-14 w-full max-w-[22rem] items-center justify-center gap-2 rounded-full bg-white/[0.92] px-5 text-base font-semibold text-[#151711] shadow-[0_18px_52px_rgba(0,0,0,.28)] backdrop-blur-xl transition active:scale-[.98]"
          >
            <span>{t("timeFlow.openFuture")}</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={t("timeFlow.captureAria")}
            onClick={() => openCapture(activeTripDay.id)}
            className="inline-flex min-h-14 w-full max-w-[22rem] items-center justify-center gap-2 rounded-full bg-white/[0.92] px-5 text-base font-semibold text-[#151711] shadow-[0_18px_52px_rgba(0,0,0,.28)] backdrop-blur-xl transition active:scale-[.98]"
          >
            <Plus className="h-5 w-5" />
            <span>{t("timeFlow.capture")}</span>
          </button>
        )}
      </div>
      <MomentCaptureSheet
        open={Boolean(captureDayId)}
        draftText={draftText}
        selectedCount={draftFiles.length}
        saving={capturing}
        onDraftTextChange={setDraftText}
        onPickPhotos={() => capturePhotoInputRef.current?.click()}
        onSave={handleCapture}
        onClose={closeCapture}
        t={t}
      />
      <SavedMomentSheet
        open={Boolean(savedDayId)}
        day={savedTarget}
        phase={savedTargetPhase}
        locale={locale}
        setLocale={setLocale}
        onClose={() => setSavedDayId(null)}
        t={t}
      />
    </main>
  );
}
