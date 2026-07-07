import { Journey, JourneyDay } from "@/lib/domain";

export function sortedJourneyDays(journey: Journey): JourneyDay[] {
  return [...journey.days].sort((a, b) => a.date.localeCompare(b.date));
}

export function getJourneyDay(journey: Journey, dayId: string): JourneyDay | undefined {
  return journey.days.find((day) => day.id === dayId);
}

export function getCurrentJourneyDay(journey: Journey, isoDate: string): JourneyDay {
  const days = sortedJourneyDays(journey);
  return days.find((day) => day.date === isoDate) ?? days.find((day) => day.date > isoDate) ?? days.at(-1)!;
}

export function getJourneyProgress(journey: Journey, isoDate: string): number {
  const days = sortedJourneyDays(journey);
  if (!days.length) return 0;
  const completed = days.filter((day) => day.date <= isoDate).length;
  return Math.min(100, Math.max(0, Math.round((completed / days.length) * 100)));
}

export function getJourneyReferenceLabel(journey: Journey): string {
  return journey.description?.startsWith("Reference Journey") ? "Reference Journey 01" : "Local Journey";
}
