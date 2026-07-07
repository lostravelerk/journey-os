"use client";

import * as React from "react";
import zhCN from "@/locales/zh-CN.json";
import enUS from "@/locales/en-US.json";

export type Locale = "zh-CN" | "en-US";

type Messages = typeof zhCN;
type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateRange: (start: string, end: string) => string;
  formatMonth: (value: string) => string;
};

const messages: Record<Locale, Messages> = {
  "zh-CN": zhCN,
  "en-US": enUS
};

const defaultLocale: Locale = "zh-CN";
const storageKey = "journey-os:locale";
const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

function isLocale(value: string | null): value is Locale {
  return value === "zh-CN" || value === "en-US";
}

function lookup(source: Messages, key: string) {
  return key.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object" && part in value) {
      return (value as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

function interpolate(value: string, params?: TranslationParams) {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = window.localStorage.getItem(storageKey);
  return isLocale(stored) ? stored : defaultLocale;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(defaultLocale);

  React.useEffect(() => {
    setLocaleState(readInitialLocale());
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(storageKey, locale);
  }, [locale]);

  const setLocale = React.useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = React.useCallback(
    (key: string, params?: TranslationParams) => {
      const current = lookup(messages[locale], key);
      const fallback = lookup(messages[defaultLocale], key);
      const value = typeof current === "string" ? current : typeof fallback === "string" ? fallback : key;
      return interpolate(value, params);
    },
    [locale]
  );

  const formatDate = React.useCallback(
    (value: string, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        weekday: options?.weekday,
        ...options
      }).format(new Date(`${value}T12:00:00`)),
    [locale]
  );

  const formatDateRange = React.useCallback(
    (start: string, end: string) => `${formatDate(start)} - ${formatDate(end)}`,
    [formatDate]
  );

  const formatMonth = React.useCallback(
    (value: string) =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      }).format(new Date(`${value}T00:00:00Z`)),
    [locale]
  );

  const contextValue = React.useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
      formatDateRange,
      formatMonth
    }),
    [formatDate, formatDateRange, formatMonth, locale, setLocale, t]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider");
  }
  return context;
}
