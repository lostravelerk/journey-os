import Dexie, { Table } from "dexie";
import { createBlankJourneyTrip } from "@/lib/journey-factory";
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
const cleanupKey = "journey-os:future-boundary-cleanup-v1";

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

function safeSetLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // IndexedDB remains the source of truth for rich local data such as photos.
  }
}

function stripPhotoDataForFallback(trip: Trip): Trip {
  return {
    ...trip,
    days: trip.days.map((day) => ({
      ...day,
      photos: day.photos?.map((photo) => (
        photo.localUrl
          ? {
              ...photo,
              localUrl: undefined
            }
          : photo
      ))
    }))
  };
}

function writeFallbackTrips(trips: Trip[]) {
  if (typeof window === "undefined") return;
  safeSetLocalStorage(fallbackTripsKey, JSON.stringify(trips.map(stripPhotoDataForFallback)));
}

function readActiveTripId() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(activeTripKey) ?? undefined;
}

function writeActiveTripId(tripId?: string) {
  if (typeof window === "undefined") return;
  if (tripId) {
    safeSetLocalStorage(activeTripKey, tripId);
  } else {
    window.localStorage.removeItem(activeTripKey);
  }
}

function writeFallbackTrip(trip: Trip) {
  if (typeof window === "undefined") return;
  const safeTrip = stripPhotoDataForFallback(trip);
  const trips = [safeTrip, ...readFallbackTrips().filter((item) => item.id !== trip.id)];
  writeFallbackTrips(trips);
  writeActiveTripId(trip.id);
  safeSetLocalStorage(fallbackTripKey, JSON.stringify(safeTrip));
}

function removeFallbackTrip(tripId: string) {
  if (typeof window === "undefined") return;
  const trips = readFallbackTrips().filter((item) => item.id !== tripId);
  writeFallbackTrips(trips);
  if (readActiveTripId() === tripId) {
    writeActiveTripId(trips[0]?.id);
    if (trips[0]) {
      safeSetLocalStorage(fallbackTripKey, JSON.stringify(stripPhotoDataForFallback(trips[0])));
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

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function isDemoOrTestTrip(trip: Trip) {
  const name = `${trip.id} ${trip.name} ${trip.subtitle ?? ""}`.toLowerCase();
  return (
    trip.id === "trip_usa_business_roadtrip_2026" ||
    /\b(demo|sample|mock|test)\b/.test(name) ||
    name.includes("old journey")
  );
}

function createTodayTrip() {
  const today = todayIso();
  return createBlankJourneyTrip({
    title: "今天",
    startDate: today,
    endDate: today
  });
}

function createTodayAnchorDay(trip: Trip): JourneyDay {
  const today = todayIso();
  return {
    id: `today_anchor_${today}`,
    tripId: trip.id,
    dayNumber: 0,
    date: today,
    mode: "free",
    title: "此刻",
    city: "此地",
    routeLabel: "此刻",
    schedule: [],
    meals: {},
    photos: [],
    notes: [],
    visibility: "private"
  };
}

function ensureTodayAnchor(trip: Trip): Trip {
  const today = todayIso();
  if (trip.days.some((day) => day.date === today)) return trip;
  if (trip.endDate < today) return trip;

  const days = [...trip.days, createTodayAnchorDay(trip)].sort((a, b) => a.date.localeCompare(b.date));
  return {
    ...trip,
    startDate: days[0]?.date ?? trip.startDate,
    endDate: days.at(-1)?.date ?? trip.endDate,
    days: days.map((day, index) => ({
      ...day,
      dayNumber: index + 1
    }))
  };
}

async function cleanupDemoAndTestJourneys() {
  if (typeof window === "undefined" || window.localStorage.getItem(cleanupKey)) return;

  const store = db();
  const fallbackTrips = readFallbackTrips().filter((trip) => !isDemoOrTestTrip(trip));
  writeFallbackTrips(fallbackTrips);
  if (fallbackTrips.length) {
    const activeId = readActiveTripId();
    const nextActive = fallbackTrips.find((trip) => trip.id === activeId) ?? fallbackTrips[0];
    writeActiveTripId(nextActive.id);
    safeSetLocalStorage(fallbackTripKey, JSON.stringify(stripPhotoDataForFallback(nextActive)));
  } else {
    writeActiveTripId(undefined);
    window.localStorage.removeItem(fallbackTripKey);
  }

  try {
    if (store) {
      const trips = await withStorageTimeout(store.trips.toArray(), []);
      const demoIds = trips.filter(isDemoOrTestTrip).map((trip) => trip.id);
      if (demoIds.length) {
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
            await Promise.all(
              demoIds.map(async (tripId) => {
                await store.trips.delete(tripId);
                await store.journeyDays.where("tripId").equals(tripId).delete();
                await store.scheduleItems.where("tripId").equals(tripId).delete();
                await store.hotels.where("tripId").equals(tripId).delete();
                await store.meals.where("tripId").equals(tripId).delete();
                await store.notes.where("tripId").equals(tripId).delete();
                await store.photos.where("tripId").equals(tripId).delete();
                await store.shareStories.where("tripId").equals(tripId).delete();
              })
            );
          }
        );
      }
    }
  } catch {
    // Local fallback cleanup already ran.
  }

  writeFallbackStories(readFallbackStories().filter((story) => !isDemoOrTestTrip({ id: story.tripId } as Trip)));
  window.localStorage.setItem(cleanupKey, "1");
}

function normalizeVisibility(value: Visibility | "team" | "public", teamFallback: Visibility): Visibility {
  if (value === "team") return teamFallback;
  if (value === "public") return "shareable";
  return value;
}

function applyConstitutionDefaults(trip: Trip): Trip {
  const [owner] = trip.travelers;
  const anchoredTrip = ensureTodayAnchor(trip);

  return {
    ...anchoredTrip,
    travelers: [
      {
        ...(owner ?? { id: "traveler_owner", name: "Traveler", gender: "male" as const, role: "organizer" as const }),
        visibility: "private"
      }
    ],
    days: anchoredTrip.days.map((day) => ({
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
      photos: day.photos
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
  await cleanupDemoAndTestJourneys();
  const store = db();
  const activeTripId = readActiveTripId();
  const today = todayIso();
  try {
    if (store && activeTripId) {
      const active = await withStorageTimeout(store.trips.get(activeTripId), undefined);
      if (active && active.endDate >= today) {
        const normalized = applyConstitutionDefaults(active);
        writeFallbackTrip(normalized);
        return normalized;
      }
    }
    const existing = store ? await withStorageTimeout(store.trips.orderBy("updatedAt").last(), undefined) : undefined;
    if (existing && existing.endDate >= today) {
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
  const activeFallback = fallbackTrips.find((trip) => trip.id === activeTripId && trip.endDate >= today);
  if (activeFallback) return activeFallback;
  const openFallback = fallbackTrips.find((trip) => trip.endDate >= today);
  if (openFallback) return openFallback;

  const fallback = readFallbackTrip();
  if (fallback && fallback.endDate >= today) return applyConstitutionDefaults(fallback);

  const trip = createTodayTrip();
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
  await cleanupDemoAndTestJourneys();
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
    safeSetLocalStorage(fallbackTripKey, JSON.stringify(stripPhotoDataForFallback(trip)));
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
      safeSetLocalStorage(fallbackTripKey, JSON.stringify(stripPhotoDataForFallback(next)));
    }
  } else {
    writeActiveTripId(undefined);
  }
  return next;
}

export async function resetToTodayTrip() {
  const trip = createTodayTrip();
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
