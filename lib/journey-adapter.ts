import {
  EventType,
  Journey,
  JourneyDay as DomainJourneyDay,
  JourneyEvent,
  JourneyMode as DomainJourneyMode,
  Memory,
  PhotoItem as DomainPhotoItem,
  Place,
  Story,
  Visibility as DomainVisibility
} from "@/lib/domain";
import {
  JourneyMode,
  NoteItem,
  PhotoItem,
  ScheduleItem,
  ShareStory,
  ShareTheme,
  Trip,
  Visibility
} from "@/lib/schema";

function toDomainVisibility(visibility?: Visibility | "public"): DomainVisibility {
  return visibility === "shareable" || visibility === "public" ? "shareable" : "private";
}

function toDomainMode(mode?: JourneyMode): DomainJourneyMode {
  if (mode === "exhibition") return "exhibition";
  if (mode === "road_trip") return "road_trip";
  if (mode === "free") return "free";
  if (mode === "city_leisure" || mode === "national_park") return "leisure";
  return "travel";
}

function eventType(type: ScheduleItem["type"]): EventType {
  if (type === "attraction" || type === "shopping") return "activity";
  return type;
}

function placeFromSchedule(item: ScheduleItem, fallbackCity: string): Place | undefined {
  if (!item.location) return fallbackCity ? { name: fallbackCity, city: fallbackCity } : undefined;
  return {
    name: item.location,
    city: fallbackCity
  };
}

function toDomainEvent(input: {
  journeyId: string;
  dayId: string;
  city: string;
  item: ScheduleItem;
}): JourneyEvent {
  return {
    id: input.item.id,
    journeyId: input.journeyId,
    dayId: input.dayId,
    type: eventType(input.item.type),
    title: input.item.title,
    time: input.item.time,
    place: placeFromSchedule(input.item, input.city),
    description: input.item.notes,
    durationMinutes: input.item.durationMinutes,
    visibility: toDomainVisibility(input.item.visibility)
  };
}

function toDomainMemory(note: NoteItem, journeyId: string, dayId: string): Memory {
  return {
    id: note.id,
    journeyId,
    dayId,
    content: note.content,
    createdAt: note.createdAt,
    visibility: toDomainVisibility(note.visibility)
  };
}

function toDomainPhoto(photo: PhotoItem, journeyId: string): DomainPhotoItem {
  return {
    id: photo.id,
    journeyId,
    dayId: photo.dayId,
    localUrl: photo.localUrl,
    caption: photo.caption,
    tags: photo.tags,
    visibility: toDomainVisibility(photo.visibility),
    selectedForStory: photo.selectedForShare,
    createdAt: new Date().toISOString()
  };
}

function themeToDomain(theme: ShareTheme): Story["theme"] {
  if (theme === "map_story") return "map_story";
  if (theme === "soft_journal") return "soft_journal";
  return "cinematic";
}

export function toJourneyDay(day: Trip["days"][number], journeyId: string): DomainJourneyDay {
  return {
    id: day.id,
    journeyId,
    dayNumber: day.dayNumber,
    date: day.date,
    title: day.title,
    primaryPlace: {
      name: day.city,
      city: day.city
    },
    routeLabel: day.routeLabel,
    mode: toDomainMode(day.mode),
    events: day.schedule.map((item) => toDomainEvent({ journeyId, dayId: day.id, city: day.city, item })),
    memories: (day.notes ?? []).map((note) => toDomainMemory(note, journeyId, day.id)),
    photos: (day.photos ?? []).map((photo) => toDomainPhoto(photo, journeyId)),
    visibility: toDomainVisibility(day.visibility)
  };
}

export function toJourney(trip: Trip): Journey {
  const mode = trip.days.some((day) => day.mode === "road_trip")
    ? "road_trip"
    : toDomainMode(trip.days[0]?.mode);

  return {
    id: trip.id,
    title: trip.name,
    subtitle: trip.subtitle,
    description: "Reference Journey 01. The product architecture is generic; this journey is seed data.",
    startDate: trip.startDate,
    endDate: trip.endDate,
    coverPhotoId: trip.days.flatMap((day) => day.photos ?? []).find((photo) => photo.localUrl)?.id,
    mode,
    days: trip.days.map((day) => toJourneyDay(day, trip.id)),
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt
  };
}

export function toDomainStory(story: ShareStory): Story {
  return {
    id: story.id,
    journeyId: story.tripId,
    dayIds: story.days.map((day) => day.date),
    title: story.title,
    subtitle: story.subtitle,
    intro: story.memoryIntro,
    body: story.memoryBody,
    closing: story.memoryClosing,
    photoIds: story.selectedPhotoIds,
    theme: themeToDomain(story.theme),
    visibility: "shareable",
    createdAt: story.createdAt
  };
}
