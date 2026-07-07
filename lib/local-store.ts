import Dexie, { Table } from "dexie";
import { createMockTrip } from "@/lib/mock-data";
import {
  backupImportSchema,
  JourneyBackup,
  JourneyDay,
  MealPlan,
  NoteItem,
  PhotoItem,
  ScheduleItem,
  ShareStory,
  Trip,
  Visibility
} from "@/lib/schema";

const fallbackTripKey = "journey-os:trip";
const fallbackTripsKey = "journey-os:trips";
const fallbackStoriesKey = "journey-os:share-stories";
const activeTripKey = "journey-os:active-trip";

type StoredHotel = NonNullable<JourneyDay["hotel"]> & {
  id: string;
  tripId: string;
  dayId: string;
};

type StoredMeal = MealPlan & {
  id: string;
  tripId: string;
  dayId: string;
  slot: string;
};

type StoredScheduleItem = ScheduleItem & {
  tripId: string;
  dayId: string;
};

type StoredNote = NoteItem & {
  tripId: string;
  dayId: string;
};

type StoredPhoto = PhotoItem & {
  createdAt?: string;
};

class JourneyDatabase extends Dexie {
  trips!: Table<Trip, string>;
  journeyDays!: Table<JourneyDay, string>;
  scheduleItems!: Table<StoredScheduleItem, string>;
  hotels!: Table<StoredHotel, string>;
  meals!: Table<StoredMeal, string>;
  notes!: Table<StoredNote, string>;
  photos!: Table<StoredPhoto, string>;
  shareStories!: Table<ShareStory, string>;

  constructor() {
    super("journey_os_local_private");
    this.version(1).stores({
      trips: "id, name, startDate, endDate, updatedAt",
      journeyDays: "id, tripId, date, dayNumber, mode",
      scheduleItems: "id, tripId, dayId, type, time, visibility",
      hotels: "id, tripId, dayId, visibility",
      meals: "id, tripId, dayId, slot, visibility",
      notes: "id, tripId, dayId, type, visibility",
      photos: "id, tripId, dayId, visibility, selectedForShare",
      shareStories: "id, tripId, isPublished, createdAt"
    });
  }
}

let database: JourneyDatabase | undefined;

function db() {
  if (typeof window === "undefined") return undefined;
  database ??= new JourneyDatabase();
  return database;
}

function withStorageTimeout<T>(operation: Promise<T>, fallback: T, timeoutMs = 1200): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]);
}

function readFallbackTrip(): Trip | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(fallbackTripKey);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Trip;
  } catch {
    return undefined;
  }
}

function readFallbackTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(fallbackTripsKey);
  if (raw) {
    try {
      return JSON.parse(raw) as Trip[];
    } catch {
      return [];
    }
  }
  const legacy = readFallbackTrip();
  return legacy ? [legacy] : [];
}

function writeFallbackTrips(trips: Trip[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(fallbackTripsKey, JSON.stringify(trips));
}

function readActiveTripId() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(activeTripKey) ?? undefined;
}

function writeActiveTripId(tripId?: string) {
  if (typeof window === "undefined") return;
  if (tripId) {
    window.localStorage.setItem(activeTripKey, tripId);
  } else {
    window.localStorage.removeItem(activeTripKey);
  }
}

function writeFallbackTrip(trip: Trip) {
  if (typeof window === "undefined") return;
  const trips = [trip, ...readFallbackTrips().filter((item) => item.id !== trip.id)];
  writeFallbackTrips(trips);
  writeActiveTripId(trip.id);
  window.localStorage.setItem(fallbackTripKey, JSON.stringify(trip));
}

function removeFallbackTrip(tripId: string) {
  if (typeof window === "undefined") return;
  const trips = readFallbackTrips().filter((item) => item.id !== tripId);
  writeFallbackTrips(trips);
  if (readActiveTripId() === tripId) {
    writeActiveTripId(trips[0]?.id);
    if (trips[0]) {
      window.localStorage.setItem(fallbackTripKey, JSON.stringify(trips[0]));
    } else {
      window.localStorage.removeItem(fallbackTripKey);
    }
  }
}

function readFallbackStories(): ShareStory[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(fallbackStoriesKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ShareStory[];
  } catch {
    return [];
  }
}

function writeFallbackStories(stories: ShareStory[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(fallbackStoriesKey, JSON.stringify(stories));
}

function normalizeVisibility(value: Visibility | "team" | "public", teamFallback: Visibility): Visibility {
  if (value === "team") return teamFallback;
  if (value === "public") return "shareable";
  return value;
}

function applyConstitutionDefaults(trip: Trip): Trip {
  const [owner] = trip.travelers;

  return {
    ...trip,
    travelers: [
      {
        ...(owner ?? { id: "traveler_owner", name: "Traveler", gender: "male" as const, role: "organizer" as const }),
        visibility: "private"
      }
    ],
    days: trip.days.map((day) => ({
      ...day,
      visibility: "private",
      hotel: day.hotel ? { ...day.hotel, visibility: "private" } : undefined,
      route: day.route ? { ...day.route, visibility: "shareable" } : undefined,
      schedule: day.schedule.map((item) => ({
        ...item,
        visibility: normalizeVisibility(item.visibility as Visibility | "team", item.type === "meeting" || item.type === "flight" ? "private" : "shareable")
      })),
      meals: {
        breakfast: day.meals.breakfast ? { ...day.meals.breakfast, visibility: normalizeVisibility(day.meals.breakfast.visibility as Visibility | "team", "private") } : undefined,
        lunch: day.meals.lunch ? { ...day.meals.lunch, visibility: normalizeVisibility(day.meals.lunch.visibility as Visibility | "team", "private") } : undefined,
        dinner: day.meals.dinner ? { ...day.meals.dinner, visibility: normalizeVisibility(day.meals.dinner.visibility as Visibility | "team", "private") } : undefined,
        coffee: day.meals.coffee?.map((meal) => ({
          ...meal,
          visibility: normalizeVisibility(meal.visibility as Visibility | "team", "private")
        }))
      },
      notes: day.notes?.map((note) => ({
        ...note,
        visibility: normalizeVisibility(note.visibility as Visibility | "team", "private")
      })),
      photos: day.photos?.map((photo) =>
        photo.tags?.includes("sample")
          ? {
              ...photo,
              visibility: "private",
              selectedForShare: false
            }
          : photo
      )
    }))
  };
}

async function persistEntityTables(trip: Trip) {
  const store = db();
  if (!store) return;

  await store.transaction(
    "rw",
    [
      store.trips,
      store.journeyDays,
      store.scheduleItems,
      store.hotels,
      store.meals,
      store.notes,
      store.photos
    ],
    async () => {
      await store.trips.put(trip);
      await store.journeyDays.where("tripId").equals(trip.id).delete();
      await store.scheduleItems.where("tripId").equals(trip.id).delete();
      await store.hotels.where("tripId").equals(trip.id).delete();
      await store.meals.where("tripId").equals(trip.id).delete();
      await store.notes.where("tripId").equals(trip.id).delete();
      await store.photos.where("tripId").equals(trip.id).delete();

      await store.journeyDays.bulkPut(trip.days);

      const scheduleItems: StoredScheduleItem[] = [];
      const hotels: StoredHotel[] = [];
      const meals: StoredMeal[] = [];
      const notes: StoredNote[] = [];
      const photos: StoredPhoto[] = [];

      trip.days.forEach((day) => {
        scheduleItems.push(...day.schedule.map((item) => ({ ...item, tripId: trip.id, dayId: day.id })));
        if (day.hotel) hotels.push({ ...day.hotel, id: `${day.id}_hotel`, tripId: trip.id, dayId: day.id });
        Object.entries(day.meals).forEach(([slot, value]) => {
          if (Array.isArray(value)) {
            value.forEach((meal, index) => meals.push({ ...meal, id: `${day.id}_${slot}_${index}`, tripId: trip.id, dayId: day.id, slot }));
          } else if (value) {
            meals.push({ ...value, id: `${day.id}_${slot}`, tripId: trip.id, dayId: day.id, slot });
          }
        });
        notes.push(...(day.notes ?? []).map((note) => ({ ...note, tripId: trip.id, dayId: day.id })));
        photos.push(...(day.photos ?? []).map((photo) => ({ ...photo, createdAt: new Date().toISOString() })));
      });

      if (scheduleItems.length) await store.scheduleItems.bulkPut(scheduleItems);
      if (hotels.length) await store.hotels.bulkPut(hotels);
      if (meals.length) await store.meals.bulkPut(meals);
      if (notes.length) await store.notes.bulkPut(notes);
      if (photos.length) await store.photos.bulkPut(photos);
    }
  );
}

export async function getOrCreateTrip() {
  const store = db();
  const activeTripId = readActiveTripId();
  try {
    if (store && activeTripId) {
      const active = await withStorageTimeout(store.trips.get(activeTripId), undefined);
      if (active) {
        const normalized = applyConstitutionDefaults(active);
        writeFallbackTrip(normalized);
        return normalized;
      }
    }
    const existing = store ? await withStorageTimeout(store.trips.orderBy("updatedAt").last(), undefined) : undefined;
    if (existing) {
      const normalized = applyConstitutionDefaults(existing);
      if (JSON.stringify(normalized) !== JSON.stringify(existing)) {
        await saveTrip(normalized);
      } else {
        writeFallbackTrip(normalized);
      }
      return normalized;
    }
  } catch {
    const fallback = readFallbackTrip();
    if (fallback) return applyConstitutionDefaults(fallback);
  }

  const fallbackTrips = readFallbackTrips().map(applyConstitutionDefaults);
  const activeFallback = fallbackTrips.find((trip) => trip.id === activeTripId);
  if (activeFallback) return activeFallback;
  if (fallbackTrips[0]) return fallbackTrips[0];

  const fallback = readFallbackTrip();
  if (fallback) return applyConstitutionDefaults(fallback);

  const trip = createMockTrip();
  await saveTrip(trip);
  return trip;
}

export async function getTrip(id: string) {
  const store = db();
  try {
    const trip = store ? await withStorageTimeout(store.trips.get(id), undefined) : undefined;
    if (trip) return applyConstitutionDefaults(trip);
  } catch {
    // fall through to fallback
  }

  const fallback = readFallbackTrips().find((trip) => trip.id === id) ?? readFallbackTrip();
  return fallback?.id === id ? applyConstitutionDefaults(fallback) : undefined;
}

export async function getTrips() {
  const store = db();
  try {
    const trips = store ? await withStorageTimeout(store.trips.orderBy("updatedAt").reverse().toArray(), []) : [];
    if (trips.length) return trips.map(applyConstitutionDefaults);
  } catch {
    // fall through to fallback
  }

  const fallbackTrips = readFallbackTrips();
  if (fallbackTrips.length) return fallbackTrips.map(applyConstitutionDefaults);
  const fallback = readFallbackTrip();
  return fallback ? [applyConstitutionDefaults(fallback)] : [];
}

export async function activateTrip(tripId: string) {
  const trip = await getTrip(tripId);
  if (!trip) return undefined;
  writeActiveTripId(trip.id);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(fallbackTripKey, JSON.stringify(trip));
  }
  return trip;
}

export async function saveTrip(trip: Trip) {
  const next = {
    ...trip,
    updatedAt: new Date().toISOString()
  };
  writeFallbackTrip(next);
  try {
    await withStorageTimeout(persistEntityTables(next), undefined);
  } catch {
    // localStorage fallback already persisted.
  }
  return next;
}

export async function deleteTrip(tripId: string) {
  const store = db();
  try {
    if (store) {
      await store.transaction(
        "rw",
        [
          store.trips,
          store.journeyDays,
          store.scheduleItems,
          store.hotels,
          store.meals,
          store.notes,
          store.photos,
          store.shareStories
        ],
        async () => {
          await store.trips.delete(tripId);
          await store.journeyDays.where("tripId").equals(tripId).delete();
          await store.scheduleItems.where("tripId").equals(tripId).delete();
          await store.hotels.where("tripId").equals(tripId).delete();
          await store.meals.where("tripId").equals(tripId).delete();
          await store.notes.where("tripId").equals(tripId).delete();
          await store.photos.where("tripId").equals(tripId).delete();
          await store.shareStories.where("tripId").equals(tripId).delete();
        }
      );
    }
  } catch {
    // local fallback cleanup still runs.
  }

  removeFallbackTrip(tripId);
  writeFallbackStories(readFallbackStories().filter((story) => story.tripId !== tripId));

  const remaining = await getTrips();
  const next = remaining[0];
  if (next) {
    writeActiveTripId(next.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(fallbackTripKey, JSON.stringify(next));
    }
  } else {
    writeActiveTripId(undefined);
  }
  return next;
}

export async function resetTripToMock() {
  const trip = createMockTrip();
  return saveTrip(trip);
}

export async function getShareStories(tripId?: string) {
  const store = db();
  try {
    const stories = store ? await store.shareStories.orderBy("createdAt").reverse().toArray() : readFallbackStories();
    return tripId ? stories.filter((story) => story.tripId === tripId) : stories;
  } catch {
    const stories = readFallbackStories();
    return tripId ? stories.filter((story) => story.tripId === tripId) : stories;
  }
}

export async function getShareStory(id: string) {
  const store = db();
  try {
    const story = store ? await store.shareStories.get(id) : undefined;
    if (story) return story;
  } catch {
    // fall through
  }
  return readFallbackStories().find((story) => story.id === id);
}

export async function saveShareStory(story: ShareStory) {
  const stories = readFallbackStories().filter((item) => item.id !== story.id);
  writeFallbackStories([story, ...stories]);

  try {
    const store = db();
    if (store) await store.shareStories.put(story);
  } catch {
    // localStorage fallback already persisted.
  }

  return story;
}

export async function exportBackupObject(): Promise<JourneyBackup> {
  const trip = await getOrCreateTrip();
  const shareStories = await getShareStories(trip.id);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    trip,
    shareStories
  };
}

export async function importBackupObject(value: unknown) {
  const parsed = backupImportSchema.parse(value) as JourneyBackup;
  const trip = await saveTrip(parsed.trip);
  writeFallbackStories(parsed.shareStories);

  try {
    const store = db();
    if (store) {
      await store.shareStories.clear();
      if (parsed.shareStories.length) await store.shareStories.bulkPut(parsed.shareStories);
    }
  } catch {
    // localStorage fallback already restored.
  }

  return trip;
}
