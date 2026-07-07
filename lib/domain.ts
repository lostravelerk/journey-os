export type Visibility = "private" | "shareable" | "public";

export type JourneyMode =
  | "travel"
  | "business"
  | "exhibition"
  | "road_trip"
  | "family"
  | "milestone"
  | "leisure"
  | "free";

export type EventType =
  | "note"
  | "flight"
  | "drive"
  | "hotel"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "coffee"
  | "activity"
  | "meeting"
  | "exhibition"
  | "photo"
  | "memory"
  | "free";

export type Journey = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  startDate: string;
  endDate: string;
  coverPhotoId?: string;
  mode?: JourneyMode;
  days: JourneyDay[];
  createdAt: string;
  updatedAt: string;
};

export type JourneyDay = {
  id: string;
  journeyId: string;
  dayNumber: number;
  date: string;
  title?: string;
  primaryPlace?: Place;
  routeLabel?: string;
  mode?: JourneyMode;
  events: JourneyEvent[];
  memories: Memory[];
  photos: PhotoItem[];
  story?: Story;
  visibility: Visibility;
};

export type JourneyEvent = {
  id: string;
  journeyId: string;
  dayId: string;
  type: EventType;
  title: string;
  time?: string;
  place?: Place;
  description?: string;
  durationMinutes?: number;
  visibility: Visibility;
};

export type Place = {
  id?: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export type Memory = {
  id: string;
  journeyId: string;
  dayId: string;
  content: string;
  refinedContent?: string;
  photoIds?: string[];
  createdAt: string;
  visibility: Visibility;
};

export type PhotoItem = {
  id: string;
  journeyId: string;
  dayId?: string;
  localUrl?: string;
  caption?: string;
  tags?: string[];
  visibility: Visibility;
  selectedForStory?: boolean;
  createdAt: string;
};

export type Story = {
  id: string;
  journeyId: string;
  dayIds: string[];
  title: string;
  subtitle?: string;
  intro?: string;
  body?: string;
  closing?: string;
  photoIds: string[];
  theme: "soft_journal" | "map_story" | "cinematic";
  visibility: Visibility;
  createdAt: string;
};

export type JourneyBook = {
  id: string;
  journeyId: string;
  title: string;
  html?: string;
  createdAt: string;
};
