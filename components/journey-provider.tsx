"use client";

import React from "react";
import {
  activateTrip,
  deleteTrip,
  exportBackupObject,
  getOrCreateTrip,
  getShareStories,
  getTrips,
  importBackupObject,
  resetToTodayTrip,
  saveShareStory,
  saveTrip
} from "@/lib/local-store";
import { downloadTextFile } from "@/lib/utils";
import { Journey } from "@/lib/domain";
import { toJourney } from "@/lib/journey-adapter";
import { makeId, NoteItem, PhotoItem, ShareStory, Trip } from "@/lib/schema";

type JourneyContextValue = {
  journey: Journey | null;
  journeys: Journey[];
  trip: Trip | null;
  trips: Trip[];
  shareStories: ShareStory[];
  loading: boolean;
  commitTrip: (trip: Trip) => Promise<Trip>;
  selectJourney: (journeyId: string) => Promise<Trip | undefined>;
  deleteJourney: (journeyId: string) => Promise<Trip | undefined>;
  updateDay: (dayId: string, updater: (day: Trip["days"][number]) => Trip["days"][number]) => Promise<void>;
  addPhotos: (dayId: string, files: FileList | File[]) => Promise<void>;
  captureMoment: (dayId: string, files: FileList | File[] | null | undefined, memoryContent: string) => Promise<void>;
  saveStory: (story: ShareStory) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<void>;
  resetToday: () => Promise<void>;
  refresh: () => Promise<void>;
};

const JourneyContext = React.createContext<JourneyContextValue | undefined>(undefined);

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function clearFutureMomentData(trip: Trip) {
  const today = todayIso();
  let changed = false;

  const days = trip.days.map((day) => {
    if (day.date <= today) return day;
    if (!(day.notes?.length || day.photos?.length)) return day;
    changed = true;
    return {
      ...day,
      notes: [],
      photos: []
    };
  });

  return changed ? { ...trip, days } : trip;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [trip, setTrip] = React.useState<Trip | null>(null);
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [shareStories, setShareStories] = React.useState<ShareStory[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const loadedTrip = await getOrCreateTrip();
    const nextTrip = clearFutureMomentData(loadedTrip);
    if (nextTrip !== loadedTrip) {
      await saveTrip(nextTrip);
    }
    setTrip(nextTrip);
    setTrips(await getTrips());
    setShareStories(await getShareStories(nextTrip.id));
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const commitTrip = React.useCallback(async (nextTrip: Trip) => {
    const saved = await saveTrip(clearFutureMomentData(nextTrip));
    setTrip(saved);
    setTrips(await getTrips());
    setShareStories(await getShareStories(saved.id));
    return saved;
  }, []);

  const selectJourney = React.useCallback(async (journeyId: string) => {
    const nextTrip = await activateTrip(journeyId);
    if (!nextTrip) return undefined;
    setTrip(nextTrip);
    setTrips(await getTrips());
    setShareStories(await getShareStories(nextTrip.id));
    return nextTrip;
  }, []);

  const deleteJourney = React.useCallback(async (journeyId: string) => {
    const nextTrip = await deleteTrip(journeyId);
    setTrip(nextTrip ?? null);
    setTrips(await getTrips());
    setShareStories(nextTrip ? await getShareStories(nextTrip.id) : []);
    return nextTrip;
  }, []);

  const updateDay = React.useCallback(
    async (dayId: string, updater: (day: Trip["days"][number]) => Trip["days"][number]) => {
      if (!trip) return;
      const nextTrip = {
        ...trip,
        days: trip.days.map((day) => (day.id === dayId ? updater(day) : day))
      };
      await commitTrip(nextTrip);
    },
    [commitTrip, trip]
  );

  const addPhotos = React.useCallback(
    async (dayId: string, files: FileList | File[]) => {
      if (!trip) return;
      const fileArray = Array.from(files);
      const urls = await Promise.all(fileArray.map(fileToDataUrl));
      const photos: PhotoItem[] = urls.map((localUrl, index) => ({
        id: makeId("photo"),
        tripId: trip.id,
        dayId,
        localUrl,
        caption: fileArray[index]?.name.replace(/\.[^.]+$/, "") ?? "Journey photo",
        tags: ["uploaded"],
        visibility: "private",
        selectedForShare: false
      }));
      await updateDay(dayId, (day) => ({
        ...day,
        photos: [...(day.photos ?? []), ...photos]
      }));
    },
    [trip, updateDay]
  );

  const captureMoment = React.useCallback(
    async (dayId: string, files: FileList | File[] | null | undefined, memoryContent: string) => {
      if (!trip) return;
      const content = memoryContent.trim();
      const fileArray = files ? Array.from(files) : [];
      if (!content && !fileArray.length) return;

      const urls = await Promise.all(fileArray.map(fileToDataUrl));
      const now = new Date().toISOString();
      const photos: PhotoItem[] = urls.map((localUrl, index) => ({
        id: makeId("photo"),
        tripId: trip.id,
        dayId,
        localUrl,
        caption: fileArray[index]?.name.replace(/\.[^.]+$/, "") || content || "Journey moment",
        tags: ["moment"],
        visibility: "private",
        selectedForShare: false
      }));
      const memory: NoteItem | null = content
        ? {
            id: makeId("note"),
            type: "memory",
            content,
            createdAt: now,
            visibility: "private"
          }
        : null;

      await updateDay(dayId, (day) => {
        const notes = day.notes ?? [];

        return {
          ...day,
          notes: memory ? [...notes, memory] : notes,
          photos: [...(day.photos ?? []), ...photos]
        };
      });
    },
    [trip, updateDay]
  );

  const saveStory = React.useCallback(async (story: ShareStory) => {
    await saveShareStory(story);
    setShareStories(await getShareStories(story.tripId));
  }, []);

  const exportBackup = React.useCallback(async () => {
    const backup = await exportBackupObject();
    downloadTextFile(
      `journey-os-backup-${backup.exportedAt.slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      "application/json"
    );
  }, []);

  const importBackup = React.useCallback(async (file: File) => {
    const raw = await file.text();
    const nextTrip = await importBackupObject(JSON.parse(raw));
    setTrip(nextTrip);
    setTrips(await getTrips());
    setShareStories(await getShareStories(nextTrip.id));
  }, []);

  const resetToday = React.useCallback(async () => {
    const nextTrip = await resetToTodayTrip();
    setTrip(nextTrip);
    setTrips(await getTrips());
    setShareStories(await getShareStories(nextTrip.id));
  }, []);

  const value = React.useMemo(
    () => ({
      journey: trip ? toJourney(trip) : null,
      journeys: trips.map(toJourney),
      trip,
      trips,
      shareStories,
      loading,
      commitTrip,
      selectJourney,
      deleteJourney,
      updateDay,
      addPhotos,
      captureMoment,
      saveStory,
      exportBackup,
      importBackup,
      resetToday,
      refresh
    }),
    [addPhotos, captureMoment, commitTrip, deleteJourney, exportBackup, importBackup, loading, refresh, resetToday, saveStory, selectJourney, shareStories, trip, trips, updateDay]
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = React.useContext(JourneyContext);
  if (!context) {
    throw new Error("useJourney must be used inside JourneyProvider");
  }
  return context;
}
