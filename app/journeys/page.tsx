"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, NotebookPen, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/field";
import { useJourney } from "@/components/journey-provider";
import { analyzeFutureJourneyInput, FutureJourneyAnalysis } from "@/lib/future-journey-import";
import { intelligenceCapabilities } from "@/lib/intelligence/registry";
import { createBlankJourneyTrip } from "@/lib/journey-factory";
import { useI18n } from "@/lib/i18n";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default function JourneysPage() {
  const router = useRouter();
  const { journey, journeys, loading, commitTrip, selectJourney, deleteJourney } = useJourney();
  const { t, formatDateRange } = useI18n();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayIso());
  const [endDate, setEndDate] = React.useState(todayIso());
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [importText, setImportText] = React.useState("");
  const [draftAnalysis, setDraftAnalysis] = React.useState<FutureJourneyAnalysis | null>(null);

  if (loading || !journey) {
    return (
      <Section>
        <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
      </Section>
    );
  }

  async function createJourney() {
    setBusy(true);
    const nextTrip = createBlankJourneyTrip({ title, startDate, endDate });
    await commitTrip(nextTrip);
    setBusy(false);
    router.push("/");
  }

  async function analyzeJourney(file?: File) {
    if (!file && !importText.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      setDraftAnalysis(await analyzeFutureJourneyInput({ file, text: importText }));
    } catch {
      setMessage(t("journeys.error"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmDraftJourney() {
    if (!draftAnalysis) return;
    setBusy(true);
    const saved = await commitTrip(draftAnalysis.trip);
    setDraftAnalysis(null);
    setImportText("");
    setBusy(false);
    router.push("/");
    void selectJourney(saved.id);
  }

  async function openJourney(journeyId: string) {
    setBusy(true);
    const selected = await selectJourney(journeyId);
    setBusy(false);
    if (!selected) return;
    router.push("/");
  }

  const today = todayIso();
  const futureJourneys = (journeys.length ? journeys : [journey]).filter((item) => item.endDate >= today);
  const visibleJourneys = futureJourneys;
  const canDelete = visibleJourneys.length > 1;

  async function removeJourney(journeyId: string) {
    if (!canDelete) return;
    setBusy(true);
    await deleteJourney(journeyId);
    setPendingDelete(null);
    setBusy(false);
  }

  return (
    <Section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="green">{t("journeys.badge")}</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-0 sm:text-6xl">{t("journeys.title")}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-black/55 dark:text-white/55">{t("journeys.futureSpaceDescription")}</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt,.md,.json,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif"
            className="hidden"
            onChange={(event) => void analyzeJourney(event.target.files?.[0])}
          />
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" />
            {t("journeys.bringIn")}
          </Button>
          <Button onClick={() => setCreating((value) => !value)} disabled={busy}>
            <Plus className="h-4 w-4" />
            {t("common.new")}
          </Button>
        </div>
      </div>

      {creating ? (
        <Card className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_160px_160px_auto] sm:items-end">
            <div>
              <Label>{t("journeys.journeyName")}</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("journeys.journeyNamePlaceholder")} />
            </div>
            <div>
              <Label>{t("journeys.start")}</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div>
              <Label>{t("journeys.end")}</Label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <Button onClick={() => void createJourney()} disabled={busy}>
              <Plus className="h-4 w-4" />
              {t("common.create")}
            </Button>
          </div>
        </Card>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-signal/20 bg-signal/[0.06] px-4 py-3 text-sm text-signal">
          {message}
        </p>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Badge tone="green">{t("journeys.futureImportBadge")}</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-0">{t("journeys.futureImportTitle")}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/55 dark:text-white/55">{t("journeys.futureImportDescription")}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-black/45 dark:text-white/45">
              <span>{t("journeys.sourceExcel")}</span>
              <span>{t("journeys.sourcePdf")}</span>
              <span>{t("journeys.sourceImage")}</span>
              <span>{t("journeys.sourceText")}</span>
              <span>{t("journeys.sourceEmail")}</span>
            </div>
          </div>
          <div>
            <Label>{t("journeys.pasteJourney")}</Label>
            <Textarea
              value={importText}
              onChange={(event) => setImportText(event.currentTarget.value)}
              placeholder={t("journeys.pastePlaceholder")}
              className="mt-2 min-h-32"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void analyzeJourney()} disabled={busy || !importText.trim()}>
                <Sparkles className="h-4 w-4" />
                {t("journeys.understandJourney")}
              </Button>
              <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4" />
                {t("journeys.chooseFile")}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-black/42 dark:text-white/42">{t("journeys.aiLayerNotice")}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <Badge tone="green">{t("journeys.intelligenceBadge")}</Badge>
        <div className="mt-4 grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-0">{t("journeys.intelligenceTitle")}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/55 dark:text-white/55">{t("journeys.intelligenceDescription")}</p>
          </div>
          <div className="grid gap-3">
            {intelligenceCapabilities.map((capability) => (
              <div key={capability.id} className="rounded-lg border border-black/10 bg-white/45 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{t(capability.labelKey)}</p>
                  <Badge tone="gold">{capability.provider}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-black/45 dark:text-white/45">{t("journeys.intelligenceDraftOnly")}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {draftAnalysis ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Badge tone="gold">{t("journeys.draftBadge")}</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-0">{draftAnalysis.trip.name}</h2>
              <p className="mt-3 text-sm leading-6 text-black/55 dark:text-white/55">
                {t("journeys.draftSummary", {
                  days: draftAnalysis.summary.days,
                  nodes: draftAnalysis.summary.plannedNodes,
                  places: draftAnalysis.summary.places.length
                })}
              </p>
              <div className="mt-5 space-y-3 text-sm leading-6 text-black/55 dark:text-white/55">
                <p className="flex gap-2">
                  <FileText className="mt-1 h-4 w-4 shrink-0" />
                  <span>{t("journeys.sourceName", { name: draftAnalysis.sourceName })}</span>
                </p>
                <p className="rounded-lg border border-black/10 bg-white/45 p-3 text-black/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/60">
                  {draftAnalysis.aiDraft}
                </p>
                <p>{t("journeys.confirmRule")}</p>
                {draftAnalysis.summary.missingStayDays ? (
                  <p>{t("journeys.missingStay", { count: draftAnalysis.summary.missingStayDays })}</p>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => void confirmDraftJourney()} disabled={busy}>
                  <Plus className="h-4 w-4" />
                  {t("journeys.addToJourney")}
                </Button>
                <Button variant="ghost" onClick={() => setDraftAnalysis(null)} disabled={busy}>
                  {t("journeys.ignoreDraft")}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {draftAnalysis.trip.days.slice(0, 6).map((day) => (
                <div key={day.id} className="border-b border-black/10 pb-3 last:border-b-0 dark:border-white/10">
                  <p className="text-xs text-black/40 dark:text-white/40">{day.date}</p>
                  <p className="mt-1 text-lg font-semibold">{day.routeLabel || day.title}</p>
                  <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                    {day.city} · {t("journeys.planNodeCount", { count: day.schedule.length })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {!visibleJourneys.length ? (
          <Card className="p-5 sm:p-6">
            <p className="text-2xl font-semibold tracking-0">{t("journeys.emptyFutureTitle")}</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/55 dark:text-white/55">{t("journeys.emptyFutureDescription")}</p>
          </Card>
        ) : null}

        {visibleJourneys.map((item) => (
          <Card key={item.id} className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{t("journeys.possibility")}</Badge>
                  {item.id === journey.id ? <Badge tone="green">{t("journeys.open")}</Badge> : null}
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-0">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-black/55 dark:text-white/55">
                  {t("journeys.dateLine", {
                    range: formatDateRange(item.startDate, item.endDate),
                    count: item.days.length
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void openJourney(item.id)} disabled={busy}>
                  <NotebookPen className="h-4 w-4" />
                  {t("journeys.enterNow")}
                </Button>
                {canDelete ? (
                  pendingDelete === item.id ? (
                    <>
                      <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={busy}>
                        {t("common.cancel")}
                      </Button>
                      <Button variant="danger" onClick={() => void removeJourney(item.id)} disabled={busy}>
                        <Trash2 className="h-4 w-4" />
                        {t("common.delete")}
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" onClick={() => setPendingDelete(item.id)} disabled={busy}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
