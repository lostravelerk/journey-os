"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, NotebookPen, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { useJourney } from "@/components/journey-provider";
import { getCurrentJourneyDay, getJourneyReferenceLabel } from "@/lib/engines/journey-engine";
import { createBlankJourneyTrip } from "@/lib/journey-factory";
import { parseJourneyFile } from "@/lib/journey-importer";
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
    router.push(`/day?day=${encodeURIComponent(nextTrip.days[0].id)}`);
  }

  async function importJourney(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const nextTrip = await parseJourneyFile(file);
      await commitTrip(nextTrip);
      router.push("/calendar");
    } catch {
      setMessage(t("journeys.error"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openJourney(journeyId: string, target: "today" | "calendar") {
    setBusy(true);
    const selected = await selectJourney(journeyId);
    setBusy(false);
    if (!selected) return;
    if (target === "calendar") {
      router.push("/calendar");
      return;
    }
    const selectedJourney = journeys.find((item) => item.id === journeyId);
    const today = selectedJourney ? getCurrentJourneyDay(selectedJourney, todayIso()) : selected.days[0];
    router.push(`/day?day=${encodeURIComponent(today.id)}`);
  }

  const visibleJourneys = journeys.length ? journeys : [journey];
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
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt,.md,.json"
            className="hidden"
            onChange={(event) => void importJourney(event.target.files?.[0])}
          />
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" />
            {t("common.import")}
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

      <div className="grid gap-3">
        {visibleJourneys.map((item) => (
          <Card key={item.id} className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{getJourneyReferenceLabel(item)}</Badge>
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
                <Button onClick={() => void openJourney(item.id, "today")} disabled={busy}>
                  <NotebookPen className="h-4 w-4" />
                  {t("journeys.today")}
                </Button>
                <Button variant="secondary" onClick={() => void openJourney(item.id, "calendar")} disabled={busy}>
                  <CalendarDays className="h-4 w-4" />
                  {t("journeys.calendar")}
                  <ArrowRight className="h-4 w-4" />
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
