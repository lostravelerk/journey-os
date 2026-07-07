"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, Check, CloudSun, Image as ImageIcon, MapPin, Mic, Plus, Sparkles, Square, Trash2, X } from "lucide-react";
import { useJourney } from "@/components/journey-provider";
import { getCurrentJourneyDay } from "@/lib/engines/journey-engine";
import { primaryMemory } from "@/lib/engines/memory-engine";
import { requestJourneyIntelligence } from "@/lib/intelligence/intelligence-service";
import type { IntelligenceProvider } from "@/lib/intelligence/types";
import { JourneyDay as DomainDay } from "@/lib/domain";
import { JourneyDay as TripDay, WeatherSummary } from "@/lib/schema";
import { Locale, useI18n } from "@/lib/i18n";
import { canUseRichLocalStorage } from "@/lib/local-store";

const fallbackImages = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1800&q=80"
];

type TimePhase = "memory" | "now" | "future";
type CaptureSystemState = "checking" | "ready" | "blocked";

type CaptureEnvironment = {
  storageReady: boolean | null;
  locationState: CaptureSystemState;
  weatherState: CaptureSystemState;
  placeLabel?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  weather?: WeatherSummary;
  message?: string;
};

const emptyCaptureEnvironment: CaptureEnvironment = {
  storageReady: null,
  locationState: "checking",
  weatherState: "checking"
};

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

function shortDate(value: string) {
  return value.slice(5).replace("-", ".");
}

function fullDate(value: string) {
  return value.replaceAll("-", ".");
}

function quietPlace(day: TripDay) {
  const place = day.city || day.route?.end || day.route?.start || day.title;
  if (place === "Place to remember" || place === "Here") return "此地";
  return place.replace(/\s*->\s*/g, " · ").replace(/\s*\/\s*/g, " · ");
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

  return `${fallback}${highC ? ` · ${highC}°C` : ""}`;
}

function weatherCodeLabel(code: number, locale: Locale) {
  const zh: Record<number, string> = {
    0: "晴",
    1: "少云",
    2: "多云",
    3: "阴",
    45: "雾",
    48: "雾凇",
    51: "小毛毛雨",
    53: "毛毛雨",
    55: "强毛毛雨",
    61: "小雨",
    63: "雨",
    65: "大雨",
    71: "小雪",
    73: "雪",
    75: "大雪",
    80: "阵雨",
    81: "阵雨",
    82: "强阵雨",
    95: "雷雨"
  };
  const en: Record<number, string> = {
    0: "Clear",
    1: "Mostly clear",
    2: "Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Showers",
    81: "Showers",
    82: "Heavy showers",
    95: "Thunderstorm"
  };

  return locale === "zh-CN" ? zh[code] ?? "天气已记录" : en[code] ?? "Weather kept";
}

function coordinateLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function getBrowserPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 10_000
    });
  });
}

async function getCurrentWeather(latitude: number, longitude: number, locale: Locale): Promise<WeatherSummary> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`,
      { signal: controller.signal }
    );
    if (!response.ok) throw new Error("Weather request failed.");
    const data = await response.json() as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
      };
    };
    const current = data.current ?? {};
    const weatherCode = typeof current.weather_code === "number" ? current.weather_code : undefined;
    const temperature = typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m) : undefined;
    return {
      highC: temperature,
      feelsLikeC: temperature,
      humidity: typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : undefined,
      windKph: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : undefined,
      description: weatherCode !== undefined ? weatherCodeLabel(weatherCode, locale) : locale === "zh-CN" ? "天气已记录" : "Weather kept"
    };
  } finally {
    window.clearTimeout(timer);
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
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

function fragmentLine(item: TripDay["schedule"][number], t: (key: string, params?: Record<string, string | number>) => string) {
  return item.notes?.trim() || t("timeFlow.fragmentFallback", { title: item.title });
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
  items,
  t
}: {
  items: TripDay["schedule"];
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!items.length) return null;

  return (
    <section className="relative py-10">
      <svg className="absolute bottom-0 left-3 top-0 w-10" viewBox="0 0 40 260" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M20 0 C3 46 35 89 17 132 C1 172 33 207 18 260" stroke="rgba(255,255,255,.13)" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div className="space-y-9">
        {items.slice(0, 4).map((item, index) => (
          <div key={item.id} className="relative pl-12 text-white/[0.68]">
            <span className="absolute left-[14px] top-2 h-2 w-2 rounded-full bg-white/[0.38] shadow-[0_0_18px_rgba(255,255,255,.24)]" />
            <p className="text-xs text-white/[0.38]">{item.time || "--:--"}</p>
            <p className="mt-1 text-xl font-semibold leading-snug text-white/[0.78]">{fragmentLine(item, t)}</p>
            <p className="mt-1 text-sm text-white/[0.40]">{[item.title, item.location].filter(Boolean).join(" · ")}</p>
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
  audioReady,
  recording,
  environment,
  error,
  saving,
  refining,
  refineDraft,
  onDraftTextChange,
  onTakePhoto,
  onChoosePhotos,
  onToggleVoice,
  onRefreshEnvironment,
  onRefine,
  onAcceptRefine,
  onIgnoreRefine,
  onSave,
  onClose,
  t
}: {
  open: boolean;
  draftText: string;
  selectedCount: number;
  audioReady: boolean;
  recording: boolean;
  environment: CaptureEnvironment;
  error: string | null;
  saving: boolean;
  refining: boolean;
  refineDraft: { result: string; provider: IntelligenceProvider } | null;
  onDraftTextChange: (value: string) => void;
  onTakePhoto: () => void;
  onChoosePhotos: () => void;
  onToggleVoice: () => void;
  onRefreshEnvironment: () => void;
  onRefine: () => Promise<void>;
  onAcceptRefine: () => void;
  onIgnoreRefine: () => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!open) return null;

  const needsRichStorage = selectedCount > 0 || audioReady;
  const canSave = (Boolean(draftText.trim()) || selectedCount > 0 || audioReady) && (!needsRichStorage || environment.storageReady !== false);
  const weatherLabel = environment.weather
    ? `${environment.weather.description ?? t("timeFlow.weatherKept")}${environment.weather.highC !== undefined ? ` · ${environment.weather.highC}°C` : ""}`
    : environment.weatherState === "checking"
      ? t("timeFlow.weatherChecking")
      : t("timeFlow.weatherUnavailable");

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
          onChange={(event) => {
            onDraftTextChange(event.currentTarget.value);
            onIgnoreRefine();
          }}
          placeholder={t("timeFlow.capturePlaceholder")}
          className="mt-7 min-h-32 w-full resize-none rounded-none border-0 border-b border-black/[0.18] bg-transparent px-0 py-3 text-2xl leading-relaxed text-black outline-none placeholder:text-black/[0.32]"
        />

        {draftText.trim() ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void onRefine()}
              disabled={refining}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black/[0.06] px-4 text-sm font-semibold text-black/[0.58] transition active:scale-95 disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              <span>{refining ? t("timeFlow.refining") : t("timeFlow.refine")}</span>
            </button>
          </div>
        ) : null}

        {refineDraft ? (
          <div className="mt-4 rounded-[1.25rem] bg-white/60 px-4 py-4 shadow-[0_12px_40px_rgba(0,0,0,.06)]">
            <p className="text-xs uppercase tracking-[0.16em] text-black/[0.34]">{t("timeFlow.aiDraft", { provider: refineDraft.provider })}</p>
            <p className="mt-2 text-xl font-semibold leading-relaxed text-black/[0.78]">{refineDraft.result}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onAcceptRefine}
                className="rounded-full bg-[#151711] px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
              >
                {t("timeFlow.acceptDraft")}
              </button>
              <button
                type="button"
                onClick={onIgnoreRefine}
                className="rounded-full bg-black/[0.06] px-4 py-2 text-sm font-semibold text-black/[0.54] transition active:scale-95"
              >
                {t("timeFlow.ignoreDraft")}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onTakePhoto}
            disabled={environment.storageReady === false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black/[0.07] px-4 text-sm font-semibold text-black/[0.68] transition active:scale-95"
          >
            <Camera className="h-4 w-4" />
            <span>{t("timeFlow.takePhoto")}</span>
          </button>
          <button
            type="button"
            onClick={onChoosePhotos}
            disabled={environment.storageReady === false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black/[0.07] px-4 text-sm font-semibold text-black/[0.68] transition active:scale-95"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{t("timeFlow.chooseFromAlbum")}</span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
          <button
            type="button"
            onClick={onToggleVoice}
            disabled={environment.storageReady === false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black/[0.07] px-4 text-sm font-semibold text-black/[0.68] transition active:scale-95 disabled:opacity-40"
          >
            {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span>{recording ? t("timeFlow.stopVoice") : audioReady ? t("timeFlow.voiceReady") : t("timeFlow.recordVoice")}</span>
          </button>
          <button
            type="button"
            onClick={onRefreshEnvironment}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-black/[0.05] px-4 text-sm font-semibold text-black/[0.50] transition active:scale-95"
          >
            {t("timeFlow.refreshMomentInfo")}
          </button>
        </div>

        <div className="mt-4 rounded-[1.25rem] bg-black/[0.04] px-4 py-4 text-sm leading-relaxed text-black/[0.54]">
          <div className="flex items-center justify-between gap-3">
            <span>{t("timeFlow.storage")}</span>
            <span>{environment.storageReady === null ? t("timeFlow.storageChecking") : environment.storageReady ? t("timeFlow.storageReady") : t("timeFlow.storageBlocked")}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>{t("timeFlow.location")}</span>
            <span className="text-right">{environment.placeLabel ?? (environment.locationState === "checking" ? t("timeFlow.locationChecking") : t("timeFlow.locationUnavailable"))}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>{t("timeFlow.weather")}</span>
            <span className="text-right">{weatherLabel}</span>
          </div>
        </div>

        {environment.message ? <p className="mt-3 text-sm leading-relaxed text-black/[0.48]">{environment.message}</p> : null}
        {error ? <p className="mt-3 rounded-[1rem] bg-red-500/[0.10] px-4 py-3 text-sm leading-relaxed text-red-950/70">{error}</p> : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-black/[0.46]">
            {selectedCount ? t("timeFlow.selectedPhotos", { count: selectedCount }) : audioReady ? t("timeFlow.voiceAttached") : t("timeFlow.addPhoto")}
          </p>
          <button
            type="submit"
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#151711] px-5 py-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-35"
          >
            <Check className="h-4 w-4" />
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
  onDeleteMemory,
  onDeletePhoto,
  onClose,
  t
}: {
  open: boolean;
  day: TripDay | null;
  phase: TimePhase;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  onDeleteMemory: (dayId: string, noteId: string) => void;
  onDeletePhoto: (dayId: string, photoId: string) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!open || !day) return null;

  const isFuture = phase === "future";
  const memories = memoryNotes(day);
  const photos = day.photos ?? [];
  const visiblePhotos = photos.filter((photo) => Boolean(photo.localUrl));
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
            {visiblePhotos.length ? (
              <div className="grid grid-cols-3 gap-2">
                {visiblePhotos.slice(0, 6).map((photo) => (
                  <figure key={photo.id} className="relative overflow-hidden rounded-[1rem] bg-black/[0.04]">
                    <img src={photo.localUrl ?? ""} alt={photo.caption ?? t("timeFlow.imageAlt")} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      aria-label={t("timeFlow.deletePhoto")}
                      onClick={() => onDeletePhoto(day.id, photo.id)}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/[0.48] text-white shadow-[0_10px_24px_rgba(0,0,0,.22)] backdrop-blur-md transition active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </figure>
                ))}
              </div>
            ) : null}

            {photos.length > visiblePhotos.length ? (
              <p className="rounded-[1.25rem] bg-black/[0.04] px-4 py-3 text-sm leading-relaxed text-black/[0.52]">{t("timeFlow.photoUnavailable")}</p>
            ) : null}

            {memories.length ? (
              <div className="space-y-5">
                {memories.slice().reverse().map((memory) => (
                  <article key={memory.id} className="border-b border-black/[0.10] pb-5 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-black/[0.36]">{formatNoteTime(memory.createdAt, locale)}</p>
                      <button
                        type="button"
                        onClick={() => onDeleteMemory(day.id, memory.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/[0.05] px-3 text-xs font-semibold text-black/[0.46] transition active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t("timeFlow.deleteMemory")}</span>
                      </button>
                    </div>
                    <p className="mt-2 text-xl font-semibold leading-relaxed text-black/[0.82]">{memory.content}</p>
                    {memory.audioUrl ? (
                      <audio controls src={memory.audioUrl} className="mt-3 w-full" />
                    ) : null}
                    {memory.location?.label || memory.weather ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-black/[0.44]">
                        {memory.location?.label ? <span>{memory.location.label}</span> : null}
                        {memory.weather ? (
                          <span>
                            {memory.weather.description ?? t("timeFlow.weatherKept")}
                            {memory.weather.highC !== undefined ? ` · ${memory.weather.highC}°C` : ""}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
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
  onOpenMoment,
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
  onOpenMoment: (dayId: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const panelRef = React.useRef<HTMLElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const photos = tripDay.photos ?? [];
  const visiblePhotos = photos.filter((photo) => Boolean(photo.localUrl));
  const image = visiblePhotos[0]?.localUrl ?? fallbackImages[index % fallbackImages.length];
  const place = quietPlace(tripDay);
  const line = momentLine({ day, tripDay, locale, phase, t });
  const fragments = splitFragments(tripDay);
  const isFuture = phase === "future";
  const isQuietEmptyLine = line === t("timeFlow.defaultKept");
  const hasSavedMomentContent = !isFuture && (photos.length > 0 || memoryNotes(tripDay).length > 0);

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
        <img src={image} alt={visiblePhotos[0]?.caption ?? t("timeFlow.imageAlt")} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_28%,rgba(255,255,255,.12),transparent_26%),linear-gradient(180deg,rgba(8,10,8,.18),rgba(8,10,8,.36)_42%,rgba(8,10,8,.88))]" />
        <div className="absolute inset-x-0 top-0 z-20">
          <FlowingTimeScale moments={moments} focusIndex={index} locale={locale} />
        </div>
      </div>

      <div className="relative z-10 -mt-[100dvh] min-h-[205dvh] px-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <div className="mx-auto max-w-[34rem] pt-[calc(env(safe-area-inset-top)+9rem)]">
          <FragmentStream items={fragments.early} t={t} />

          <div ref={anchorRef} className="flex min-h-[100dvh] flex-col justify-end pb-[14dvh] pt-12">
            <div className="max-w-[34rem]">
              <div className="mb-5 flex items-center justify-between gap-4 text-xs text-white/[0.66]">
                <span className="font-serif text-lg text-white/[0.78]">{fullDate(tripDay.date)}</span>
                <span>{isTodayMoment ? clock || "--:--" : isFuture ? t("timeFlow.futureStatus") : localizedWeather(tripDay, locale, t("timeFlow.weatherFallback"))}</span>
              </div>

              <h1
                className={[
                  "max-w-[22rem] font-serif font-semibold leading-[1.06] text-white drop-shadow-[0_18px_46px_rgba(0,0,0,.36)] sm:max-w-[30rem]",
                  isQuietEmptyLine ? "text-[2.9rem] sm:text-6xl" : "text-[3.25rem] sm:text-7xl"
                ].join(" ")}
              >
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
                {hasSavedMomentContent ? (
                  <button
                    type="button"
                    onClick={() => onOpenMoment(tripDay.id)}
                    className="inline-flex min-h-10 items-center rounded-full bg-white/[0.14] px-4 text-sm font-semibold text-white/[0.78] shadow-[0_16px_44px_rgba(0,0,0,.18)] backdrop-blur-xl transition active:scale-95"
                  >
                    {t("timeFlow.viewKeptMoment")}
                  </button>
                ) : null}
              </div>

            </div>
          </div>

          <FragmentStream items={fragments.late} t={t} />

          <section className="py-12 text-white/[0.72]">
            <p className="font-serif text-2xl text-white/[0.32]">{t("timeFlow.momentDepth")}</p>
            <p className="mt-5 max-w-[28rem] text-2xl font-semibold leading-relaxed text-white/[0.80]">{line}</p>
            <SpatialCurrent place={place} index={index} />
          </section>
        </div>
      </div>
    </section>
  );
}

export default function JourneyFlowPage() {
  const { journey, trip, loading, captureMoment, updateDay } = useJourney();
  const { t, locale, setLocale } = useI18n();
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const albumInputRef = React.useRef<HTMLInputElement>(null);
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const [capturing, setCapturing] = React.useState(false);
  const [clock, setClock] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [captureDayId, setCaptureDayId] = React.useState<string | null>(null);
  const [savedDayId, setSavedDayId] = React.useState<string | null>(null);
  const [draftText, setDraftText] = React.useState("");
  const [draftFiles, setDraftFiles] = React.useState<File[]>([]);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = React.useState<string | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [captureEnvironment, setCaptureEnvironment] = React.useState<CaptureEnvironment>(emptyCaptureEnvironment);
  const [captureError, setCaptureError] = React.useState<string | null>(null);
  const [refining, setRefining] = React.useState(false);
  const [refineDraft, setRefineDraft] = React.useState<{ result: string; provider: IntelligenceProvider } | null>(null);

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

  React.useEffect(() => {
    const returnToToday = () => {
      setActiveIndex(currentIndex);
      setSavedDayId(null);
      setCaptureDayId(null);
    };
    window.addEventListener("pageshow", returnToToday);
    return () => window.removeEventListener("pageshow", returnToToday);
  }, [currentIndex]);

  React.useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

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
    setCaptureError(null);
    void refreshCaptureEnvironment(dayId);
  }

  function closeCapture() {
    cancelVoiceRecording();
    setCaptureDayId(null);
    setDraftFiles([]);
    setDraftText("");
    setAudioUrl(null);
    setAudioMimeType(null);
    setCaptureEnvironment(emptyCaptureEnvironment);
    setCaptureError(null);
    setRefineDraft(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (albumInputRef.current) albumInputRef.current.value = "";
  }

  function appendDraftFiles(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    if (!nextFiles.length) return;
    setDraftFiles((current) => [...current, ...nextFiles]);
  }

  function openCamera() {
    if (!cameraInputRef.current) return;
    cameraInputRef.current.value = "";
    cameraInputRef.current.click();
  }

  function openAlbum() {
    if (!albumInputRef.current) return;
    albumInputRef.current.value = "";
    albumInputRef.current.click();
  }

  async function refreshCaptureEnvironment(dayId?: string) {
    setCaptureEnvironment({
      ...emptyCaptureEnvironment,
      message: typeof window !== "undefined" && !window.isSecureContext ? t("timeFlow.secureContextWarning") : undefined
    });

    const storageReady = await canUseRichLocalStorage();
    setCaptureEnvironment((current) => ({
      ...current,
      storageReady
    }));

    try {
      const position = await getBrowserPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const day = trip?.days.find((item) => item.id === dayId);
      const placeLabel = day?.city || day?.routeLabel || day?.title || coordinateLabel(latitude, longitude);
      setCaptureEnvironment((current) => ({
        ...current,
        locationState: "ready",
        placeLabel,
        latitude,
        longitude,
        accuracyMeters: Math.round(position.coords.accuracy)
      }));

      try {
        const weather = await getCurrentWeather(latitude, longitude, locale);
        setCaptureEnvironment((current) => ({
          ...current,
          weatherState: "ready",
          weather
        }));
      } catch {
        setCaptureEnvironment((current) => ({
          ...current,
          weatherState: "blocked"
        }));
      }
    } catch {
      setCaptureEnvironment((current) => ({
        ...current,
        locationState: "blocked",
        weatherState: "blocked"
      }));
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setRecording(false);
  }

  function cancelVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setRecording(false);
  }

  async function toggleVoiceRecording() {
    setCaptureError(null);
    if (recording) {
      stopVoiceRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCaptureError(t("timeFlow.voiceUnavailable"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (mediaRecorderRef.current !== recorder) return;
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        void blobToDataUrl(blob).then((value) => {
          setAudioUrl(value);
          setAudioMimeType(mimeType);
        });
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setCaptureError(t("timeFlow.voicePermissionDenied"));
    }
  }

  async function handleCapture() {
    if (!captureTarget) return;
    if (timePhase(captureTarget.date, currentIso) === "future") return;
    if (!draftText.trim() && !draftFiles.length && !audioUrl) return;
    if ((draftFiles.length || audioUrl) && captureEnvironment.storageReady === false) {
      setCaptureError(t("timeFlow.storageRequired"));
      return;
    }

    setCapturing(true);
    setCaptureError(null);
    try {
      const savedId = captureTarget.id;
      await captureMoment(
        captureTarget.id,
        draftFiles,
        draftText.trim() || (audioUrl ? t("timeFlow.voiceMomentLine") : t("timeFlow.autoMomentLine")),
        {
          placeLabel: captureEnvironment.placeLabel,
          latitude: captureEnvironment.latitude,
          longitude: captureEnvironment.longitude,
          accuracyMeters: captureEnvironment.accuracyMeters,
          weather: captureEnvironment.weather,
          audioUrl: audioUrl ?? undefined,
          audioMimeType: audioMimeType ?? undefined
        }
      );
      closeCapture();
      setSavedDayId(savedId);
    } catch {
      setCaptureError(t("timeFlow.saveFailed"));
    } finally {
      setCapturing(false);
    }
  }

  async function refineMomentText() {
    if (!captureTarget || !draftText.trim()) return;
    setRefining(true);
    try {
      const response = await requestJourneyIntelligence({
        type: "memory_line",
        input: {
          text: draftText.trim(),
          place: quietPlace(captureTarget),
          time: `${captureTarget.date} ${clock || ""}`.trim()
        }
      });
      setRefineDraft({ result: response.result, provider: response.provider });
    } finally {
      setRefining(false);
    }
  }

  function deleteMemory(dayId: string, noteId: string) {
    if (!window.confirm(t("timeFlow.confirmDeleteMemory"))) return;
    void updateDay(dayId, (day) => ({
      ...day,
      notes: (day.notes ?? []).filter((note) => note.id !== noteId)
    }));
  }

  function deletePhoto(dayId: string, photoId: string) {
    if (!window.confirm(t("timeFlow.confirmDeletePhoto"))) return;
    void updateDay(dayId, (day) => ({
      ...day,
      photos: (day.photos ?? []).filter((photo) => photo.id !== photoId)
    }));
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
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
        onChange={(event) => appendDraftFiles(event.currentTarget.files)}
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        multiple
        className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
        onChange={(event) => appendDraftFiles(event.currentTarget.files)}
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
            onOpenMoment={setSavedDayId}
            t={t}
          />
        ))}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/70 via-black/28 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-7">
        <div className="mx-auto flex max-w-[20rem] flex-col items-center gap-3">
        {activePhase === "future" ? (
          <button
            type="button"
            onClick={() => setSavedDayId(activeTripDay.id)}
            className="inline-flex h-16 min-w-[9.5rem] items-center justify-center rounded-full bg-white/[0.18] px-6 text-base font-semibold text-white shadow-[0_18px_52px_rgba(0,0,0,.26)] backdrop-blur-2xl transition active:scale-[.98]"
          >
            <span>{t("timeFlow.openFuture")}</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={t("timeFlow.captureAria")}
            onClick={() => openCapture(activeTripDay.id)}
            className="group inline-flex flex-col items-center gap-2 text-white transition active:scale-[.98]"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/[0.94] text-[#151711] shadow-[0_18px_52px_rgba(0,0,0,.28)] backdrop-blur-2xl">
              <Plus className="h-7 w-7" />
            </span>
            <span className="text-sm font-semibold text-white/[0.82]">{t("timeFlow.capture")}</span>
          </button>
        )}
          {activePhase !== "future" && (activeTripDay.photos?.length || memoryNotes(activeTripDay).length) ? (
            <button
              type="button"
              onClick={() => setSavedDayId(activeTripDay.id)}
              className="text-xs font-semibold text-white/[0.56] transition active:scale-95"
            >
              {t("timeFlow.viewKeptMoment")}
            </button>
          ) : null}
        </div>
      </div>
      <MomentCaptureSheet
        open={Boolean(captureDayId)}
        draftText={draftText}
        selectedCount={draftFiles.length}
        audioReady={Boolean(audioUrl)}
        recording={recording}
        environment={captureEnvironment}
        error={captureError}
        saving={capturing}
        refining={refining}
        refineDraft={refineDraft}
        onDraftTextChange={setDraftText}
        onTakePhoto={openCamera}
        onChoosePhotos={openAlbum}
        onToggleVoice={toggleVoiceRecording}
        onRefreshEnvironment={() => void refreshCaptureEnvironment(captureTarget?.id)}
        onRefine={refineMomentText}
        onAcceptRefine={() => {
          if (!refineDraft) return;
          setDraftText(refineDraft.result);
          setRefineDraft(null);
        }}
        onIgnoreRefine={() => setRefineDraft(null)}
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
        onDeleteMemory={deleteMemory}
        onDeletePhoto={deletePhoto}
        onClose={() => setSavedDayId(null)}
        t={t}
      />
    </main>
  );
}
