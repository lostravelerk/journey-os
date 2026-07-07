import { z } from "zod";

export type Visibility = "private" | "shareable";
export type SaveMode = "local_private" | "encrypted_sync" | "selective_share";
export type JourneyMode =
  | "flight"
  | "exhibition"
  | "road_trip"
  | "city_leisure"
  | "national_park"
  | "free";
export type RiskLevel = "low" | "medium" | "high" | "extreme";
export type ShareTheme = "desert_noir" | "soft_journal" | "map_story";

export type Trip = {
  id: string;
  name: string;
  subtitle?: string;
  travelers: Traveler[];
  startDate: string;
  endDate: string;
  saveMode: SaveMode;
  days: JourneyDay[];
  createdAt: string;
  updatedAt: string;
};

export type Traveler = {
  id: string;
  name?: string;
  gender?: "male" | "female" | "other";
  role?: "driver" | "navigator" | "photographer" | "organizer";
  visibility: Visibility;
};

export type JourneyDay = {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  mode: JourneyMode;
  title: string;
  city: string;
  routeLabel?: string;
  hotel?: Hotel;
  schedule: ScheduleItem[];
  meals: Meals;
  weather?: WeatherSummary;
  outfit?: OutfitAdvice;
  route?: RouteSegment;
  photos?: PhotoItem[];
  notes?: NoteItem[];
  riskLevel?: RiskLevel;
  visibility: Visibility;
};

export type ScheduleItem = {
  id: string;
  time?: string;
  title: string;
  type:
    | "breakfast"
    | "drive"
    | "attraction"
    | "lunch"
    | "coffee"
    | "hotel"
    | "dinner"
    | "meeting"
    | "exhibition"
    | "flight"
    | "shopping"
    | "free";
  location?: string;
  durationMinutes?: number;
  notes?: string;
  visibility: Visibility;
};

export type Hotel = {
  name: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  breakfastIncluded?: boolean;
  parking?: string;
  reservationNumber?: string;
  notes?: string;
  visibility: Visibility;
};

export type Meals = {
  breakfast?: MealPlan;
  lunch?: MealPlan;
  dinner?: MealPlan;
  coffee?: MealPlan[];
};

export type MealPlan = {
  name?: string;
  cuisine?: string;
  address?: string;
  reservation?: boolean;
  priceLevel?: string;
  notes?: string;
  source?: "manual" | "suggested";
  visibility: Visibility;
};

export type WeatherSummary = {
  highC?: number;
  lowC?: number;
  feelsLikeC?: number;
  humidity?: number;
  uvIndex?: number;
  rainProbability?: number;
  windKph?: number;
  description?: string;
};

export type OutfitAdvice = {
  top?: string;
  bottom?: string;
  shoes?: string;
  outerwear?: string;
  accessories?: string[];
  avoid?: string[];
  reason?: string;
};

export type RouteSegment = {
  start?: string;
  end?: string;
  distanceKm?: number;
  drivingMinutes?: number;
  stops?: string[];
  fuelAdvice?: string;
  drivingAdvice?: string;
  visibility: Visibility;
};

export type PhotoItem = {
  id: string;
  tripId: string;
  dayId: string;
  localUrl?: string;
  caption?: string;
  tags?: string[];
  visibility: Visibility;
  selectedForShare: boolean;
};

export type NoteItem = {
  id: string;
  type: "general" | "business" | "exhibition" | "restaurant" | "memory";
  content: string;
  createdAt: string;
  visibility: Visibility;
  audioUrl?: string;
  audioMimeType?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    label?: string;
  };
  weather?: WeatherSummary;
};

export type ShareStory = {
  id: string;
  tripId: string;
  title: string;
  subtitle?: string;
  authorTag: string;
  dateRange: {
    start: string;
    end: string;
  };
  days: ShareStoryDay[];
  theme: ShareTheme;
  userSeedText?: string;
  memoryIntro?: string;
  memoryBody?: string;
  memoryClosing?: string;
  selectedPhotoIds: string[];
  sharePolicy: SharePolicy;
  isPublished: boolean;
  createdAt: string;
  momentsCopy?: string;
};

export type ShareStoryDay = {
  date: string;
  title: string;
  routeLabel: string;
  cityLabels: string[];
  weatherLabel?: string;
  temperatureRange?: string;
  timeline: ShareTimelineNode[];
  summary?: string;
  photos?: PhotoItem[];
  distanceKm?: number;
};

export type ShareTimelineNode = {
  time?: string;
  title: string;
  locationLabel: string;
  description?: string;
  photoIds?: string[];
  weather?: string;
  temperature?: string;
};

export type SharePolicy = {
  includeHotels: boolean;
  includeFlights: boolean;
  includeExactGps: boolean;
  includeExpenses: boolean;
  includePeopleNames: boolean;
  includeBusinessContacts: boolean;
  includePrivateNotes: boolean;
};

export type JourneyBackup = {
  version: 1;
  exportedAt: string;
  trip: Trip;
  shareStories: ShareStory[];
};

export const defaultSharePolicy: SharePolicy = {
  includeHotels: false,
  includeFlights: false,
  includeExactGps: false,
  includeExpenses: false,
  includePeopleNames: false,
  includeBusinessContacts: false,
  includePrivateNotes: false
};

export const tripImportSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  saveMode: z.enum(["local_private", "encrypted_sync", "selective_share"]),
  days: z.array(z.any()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const backupImportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  trip: tripImportSchema,
  shareStories: z.array(z.any()).default([])
});

export const modeLabels: Record<JourneyMode, string> = {
  flight: "Flight",
  exhibition: "Exhibition",
  road_trip: "Road Trip",
  city_leisure: "City Leisure",
  national_park: "National Park",
  free: "Free"
};

export const modeClasses: Record<JourneyMode, string> = {
  flight: "bg-indigo-500/[0.09] text-indigo-700 ring-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-300/20",
  exhibition: "bg-sky-500/[0.09] text-sky-700 ring-sky-500/15 dark:text-sky-100 dark:ring-sky-300/20",
  road_trip: "bg-emerald-500/[0.09] text-emerald-700 ring-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-300/20",
  city_leisure: "bg-brass/[0.1] text-brass ring-brass/18",
  national_park: "bg-moss/[0.1] text-moss ring-moss/18 dark:text-emerald-100",
  free: "bg-black/[0.04] text-graphite ring-black/10 dark:bg-white/10 dark:text-white dark:ring-white/20"
};

export const riskClasses: Record<RiskLevel, string> = {
  low: "border-mineral/30 text-mineral",
  medium: "border-brass/50 text-brass",
  high: "border-canyon/28 bg-canyon/[0.06] text-canyon",
  extreme: "border-signal/35 bg-signal/[0.06] text-signal"
};

export const makeId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
