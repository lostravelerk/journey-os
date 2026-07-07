"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Hotel,
  Lock,
  Plus,
  Save,
  Share2,
  Trash2,
  Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { useJourney } from "@/components/journey-provider";
import { JourneyDay, MealPlan, NoteItem, ScheduleItem, Visibility } from "@/lib/schema";
import { useI18n } from "@/lib/i18n";

const visibilityOptions: Visibility[] = ["private", "shareable"];
const mealSlots = ["breakfast", "lunch", "dinner"] as const;

function emptyMeal(): MealPlan {
  return {
    name: "",
    cuisine: "",
    reservation: false,
    priceLevel: "",
    notes: "",
    source: "manual",
    visibility: "private"
  };
}

function DayFallback() {
  return (
    <Section>
      <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
    </Section>
  );
}

export default function DayPage() {
  return (
    <React.Suspense fallback={<DayFallback />}>
      <DayPageContent />
    </React.Suspense>
  );
}

function DayPageContent() {
  const searchParams = useSearchParams();
  const { trip, loading, updateDay, addPhotos } = useJourney();
  const { t, formatDate } = useI18n();
  const requestedDayId = searchParams.get("day") ?? "";
  const sourceDay = trip?.days.find((day) => day.id === requestedDayId) ?? trip?.days[0];
  const [draft, setDraft] = React.useState<JourneyDay | null>(sourceDay ?? null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setDraft(sourceDay ?? null);
  }, [sourceDay]);

  if (loading || !trip || !draft) {
    return (
      <Section>
        <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
      </Section>
    );
  }

  const dayDraft = draft;
  const index = trip.days.findIndex((day) => day.id === dayDraft.id);
  const prev = trip.days[index - 1];
  const next = trip.days[index + 1];

  function patch(nextDraft: JourneyDay) {
    setDraft(nextDraft);
    setSaved(false);
  }

  function updateSchedule(itemId: string, field: keyof ScheduleItem, value: string) {
    patch({
      ...dayDraft,
      schedule: dayDraft.schedule.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    });
  }

  function addScheduleItem() {
    const item: ScheduleItem = {
      id: `schedule_${Date.now()}`,
      title: "",
      type: "free",
      location: dayDraft.city,
      visibility: "private"
    };
    patch({
      ...dayDraft,
      schedule: [...dayDraft.schedule, item]
    });
  }

  function removeScheduleItem(itemId: string) {
    patch({
      ...dayDraft,
      schedule: dayDraft.schedule.filter((item) => item.id !== itemId)
    });
  }

  function updateMeal(slot: (typeof mealSlots)[number], field: keyof MealPlan, value: string | boolean) {
    const current = dayDraft.meals[slot] ?? emptyMeal();
    patch({
      ...dayDraft,
      meals: {
        ...dayDraft.meals,
        [slot]: {
          ...current,
          [field]: value
        }
      }
    });
  }

  function updateNote(noteId: string, value: string) {
    patch({
      ...dayDraft,
      notes: (dayDraft.notes ?? []).map((note) => (note.id === noteId ? { ...note, content: value } : note))
    });
  }

  function addNote() {
    const note: NoteItem = {
      id: `note_${Date.now()}`,
      type: "memory",
      content: "",
      createdAt: new Date().toISOString(),
      visibility: "private"
    };
    patch({
      ...dayDraft,
      notes: [...(dayDraft.notes ?? []), note]
    });
  }

  function togglePhotoShare(photoId: string) {
    patch({
      ...dayDraft,
      photos: (dayDraft.photos ?? []).map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              selectedForShare: !photo.selectedForShare,
              visibility: photo.selectedForShare ? "private" : "shareable"
            }
          : photo
      )
    });
  }

  async function save() {
    await updateDay(dayDraft.id, () => dayDraft);
    setSaved(true);
  }

  return (
    <Section className="mx-auto max-w-4xl space-y-6 py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="max-w-5xl text-4xl font-semibold leading-[0.98] tracking-0 sm:text-6xl">
            {t("day.writeMoment")}
          </h1>
          <p className="mt-4 text-sm text-black/50 dark:text-white/50">
            {formatDate(dayDraft.date, { weekday: "long" })} · {dayDraft.routeLabel ?? dayDraft.city}
          </p>
        </div>
        <div className="flex gap-2">
          {prev ? (
            <Link
              href={`/day?day=${encodeURIComponent(prev.id)}`}
              aria-label={t("common.day", { number: prev.dayNumber })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-ink transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-paper dark:hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : null}
          {next ? (
            <Link
              href={`/day?day=${encodeURIComponent(next.id)}`}
              aria-label={t("common.day", { number: next.dayNumber })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-ink transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-paper dark:hover:bg-white/15"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <Button onClick={() => void save()}>
            <Save className="h-4 w-4" />
            {saved ? t("common.saved") : t("common.save")}
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="grid gap-3">
          {(dayDraft.notes ?? []).map((note) => (
            <Textarea
              key={note.id}
              className="min-h-44 border-0 bg-transparent p-0 text-2xl font-semibold leading-snug shadow-none focus-visible:ring-0"
              value={note.content}
              onChange={(event) => updateNote(note.id, event.target.value)}
              placeholder={t("day.memoryPlaceholder")}
            />
          ))}
          {!dayDraft.notes?.length ? (
            <button
              type="button"
              onClick={addNote}
              className="rounded-lg border border-black/10 bg-white/45 p-6 text-left text-2xl font-semibold leading-snug text-black/58 transition hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-white/58 dark:hover:bg-white/10"
            >
              {t("day.memoryEmpty")}
            </button>
          ) : null}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-brass" />
            <h2 className="text-xl font-semibold">{t("day.photos")}</h2>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 text-sm font-medium dark:border-white/10 dark:bg-white/10">
            <Camera className="h-4 w-4" />
            {t("common.add")}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => event.target.files && void addPhotos(dayDraft.id, event.target.files)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(dayDraft.photos ?? []).map((photo) => (
            <figure key={photo.id} className="overflow-hidden rounded-lg border border-black/10 bg-black/5 dark:border-white/10">
              <div className="relative">
                <img src={photo.localUrl} alt={photo.caption ?? t("common.storyPhotoAlt")} className="aspect-[4/3] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => togglePhotoShare(photo.id)}
                  aria-label={photo.selectedForShare ? t("day.keepPhotoPrivate") : t("day.choosePhotoShare")}
                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur"
                >
                  {photo.selectedForShare ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </button>
              </div>
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-black/56 dark:text-white/56">
                <span className="truncate">{photo.caption ?? t("common.storyPhotoAlt")}</span>
                <span className="inline-flex items-center gap-1 text-[11px]">
                  {photo.selectedForShare ? <Share2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {photo.selectedForShare ? t("common.share") : t("common.private")}
                </span>
              </figcaption>
            </figure>
          ))}
          {!dayDraft.photos?.length ? (
            <p className="col-span-full rounded-lg border border-black/10 p-4 text-sm leading-6 text-black/55 dark:border-white/10 dark:text-white/55">
              {t("day.photosEmpty")}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brass" />
              <h2 className="text-xl font-semibold">{t("day.story")}</h2>
            </div>
            <p className="text-sm leading-6 text-black/56 dark:text-white/56">{t("day.storyHelp")}</p>
          </div>
          <Link
            href={`/share?day=${encodeURIComponent(dayDraft.id)}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper shadow-soft dark:bg-paper dark:text-ink"
          >
            <Share2 className="h-4 w-4" />
            {t("day.story")}
          </Link>
        </div>
      </Card>

      <details className="group rounded-lg border border-black/10 bg-white/50 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
        <summary className="cursor-pointer list-none text-sm font-medium text-black/62 marker:hidden dark:text-white/62">
          {t("day.privatePlanDetails")}
        </summary>
        <div className="mt-5 grid gap-5">
          <Card className="p-4 shadow-none sm:p-5">
            <h2 className="mb-4 text-xl font-semibold">{t("day.dayBasics")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("day.title")}</Label>
                <Input
                  value={dayDraft.title}
                  onChange={(event) =>
                    patch({
                      ...dayDraft,
                      title: event.target.value
                    })
                  }
                />
              </div>
              <div>
                <Label>{t("day.date")}</Label>
                <Input
                  type="date"
                  value={dayDraft.date}
                  onChange={(event) =>
                    patch({
                      ...dayDraft,
                      date: event.target.value
                    })
                  }
                />
              </div>
              <div>
                <Label>{t("day.place")}</Label>
                <Input
                  value={dayDraft.city}
                  onChange={(event) =>
                    patch({
                      ...dayDraft,
                      city: event.target.value
                    })
                  }
                />
              </div>
              <div>
                <Label>{t("day.route")}</Label>
                <Input
                  value={dayDraft.routeLabel ?? ""}
                  onChange={(event) =>
                    patch({
                      ...dayDraft,
                      routeLabel: event.target.value
                    })
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-none sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{t("day.timeline")}</h2>
              <Button variant="secondary" size="sm" onClick={addScheduleItem}>
                <Plus className="h-4 w-4" />
                {t("common.add")}
              </Button>
            </div>
            <div className="grid gap-3">
              {dayDraft.schedule.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10 lg:grid-cols-[86px_1fr_1fr_132px_40px]">
                  <Input value={item.time ?? ""} onChange={(event) => updateSchedule(item.id, "time", event.target.value)} placeholder={t("day.time")} />
                  <Input value={item.title} onChange={(event) => updateSchedule(item.id, "title", event.target.value)} placeholder={t("day.eventTitle")} />
                  <Input value={item.location ?? ""} onChange={(event) => updateSchedule(item.id, "location", event.target.value)} placeholder={t("day.eventPlace")} />
                  <Select value={item.visibility} onChange={(event) => updateSchedule(item.id, "visibility", event.target.value)}>
                    {visibilityOptions.map((visibility) => (
                      <option key={visibility} value={visibility}>
                        {t(`visibility.${visibility}`)}
                      </option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeScheduleItem(item.id)} aria-label={t("day.removeEvent")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!dayDraft.schedule.length ? (
                <p className="rounded-lg border border-black/10 p-4 text-sm text-black/55 dark:border-white/10 dark:text-white/55">
                  {t("day.addOnlyNeeded")}
                </p>
              ) : null}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-4 shadow-none sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Hotel className="h-5 w-5 text-brass" />
                <h2 className="text-xl font-semibold">{t("day.stay")}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t("day.name")}</Label>
                  <Input
                    value={dayDraft.hotel?.name ?? ""}
                    onChange={(event) =>
                      patch({
                        ...dayDraft,
                        hotel: { ...(dayDraft.hotel ?? { visibility: "private" as const }), name: event.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{t("day.address")}</Label>
                  <Input
                    value={dayDraft.hotel?.address ?? ""}
                    onChange={(event) =>
                      patch({
                        ...dayDraft,
                        hotel: { ...(dayDraft.hotel ?? { name: "", visibility: "private" as const }), address: event.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{t("day.checkIn")}</Label>
                  <Input
                    value={dayDraft.hotel?.checkIn ?? ""}
                    onChange={(event) =>
                      patch({
                        ...dayDraft,
                        hotel: { ...(dayDraft.hotel ?? { name: "", visibility: "private" as const }), checkIn: event.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{t("day.order")}</Label>
                  <Input
                    value={dayDraft.hotel?.reservationNumber ?? ""}
                    onChange={(event) =>
                      patch({
                        ...dayDraft,
                        hotel: { ...(dayDraft.hotel ?? { name: "", visibility: "private" as const }), reservationNumber: event.target.value }
                      })
                    }
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 shadow-none sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-brass" />
                <h2 className="text-xl font-semibold">{t("day.meals")}</h2>
              </div>
              <div className="grid gap-4">
                {mealSlots.map((slot) => {
                  const value = dayDraft.meals[slot] ?? emptyMeal();
                  return (
                    <div key={slot} className="grid gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
                      <Label>{t(`day.${slot}`)}</Label>
                      <Input value={value.name ?? ""} onChange={(event) => updateMeal(slot, "name", event.target.value)} />
                      <Textarea className="min-h-20" value={value.notes ?? ""} onChange={(event) => updateMeal(slot, "notes", event.target.value)} placeholder={t("day.mealNotePlaceholder")} />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </details>
    </Section>
  );
}
