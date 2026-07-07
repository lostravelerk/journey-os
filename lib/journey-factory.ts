import { JourneyDay, makeId, Trip } from "@/lib/schema";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value?: string) {
  return value || todayIso();
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const safeEnd = end >= start ? end : start;
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= safeEnd && dates.length < 60) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates.length ? dates : [startDate];
}

function createBlankDay(input: {
  tripId: string;
  dayNumber: number;
  date: string;
  journeyTitle: string;
}): JourneyDay {
  return {
    id: makeId("day"),
    tripId: input.tripId,
    dayNumber: input.dayNumber,
    date: input.date,
    mode: "free",
    title: input.dayNumber === 1 ? input.journeyTitle : `Day ${input.dayNumber}`,
    city: "Place to remember",
    routeLabel: input.dayNumber === 1 ? input.journeyTitle : `Day ${input.dayNumber}`,
    schedule: [],
    meals: {},
    photos: [],
    notes: [],
    visibility: "private"
  };
}

export function createBlankJourneyTrip(input: {
  title?: string;
  startDate?: string;
  endDate?: string;
}): Trip {
  const now = new Date().toISOString();
  const title = input.title?.trim() || "Untitled Journey";
  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate || startDate);
  const id = makeId("journey");
  const dates = daysBetween(startDate, endDate);

  return {
    id,
    name: title,
    subtitle: "Local private journey",
    travelers: [
      {
        id: "traveler_owner",
        name: "Traveler",
        role: "organizer",
        visibility: "private"
      }
    ],
    startDate: dates[0],
    endDate: dates.at(-1) ?? dates[0],
    saveMode: "local_private",
    days: dates.map((date, index) =>
      createBlankDay({
        tripId: id,
        dayNumber: index + 1,
        date,
        journeyTitle: title
      })
    ),
    createdAt: now,
    updatedAt: now
  };
}
