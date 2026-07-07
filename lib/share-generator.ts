import {
  defaultSharePolicy,
  makeId,
  ShareStory,
  ShareTheme,
  Trip
} from "@/lib/schema";
import { publicSchedule, sanitizeDayForShare, selectedSharePhotos } from "@/lib/privacy";

export type ShareStoryCopy = {
  defaultTitle: string;
  fallbackRoute: string;
  changingWeather: string;
  rangeTitle: string;
  subtitle: string;
  defaultSeed: string;
  bodyMiddle: string;
  bodyPrivacy: string;
  closing: string;
  firstScene: string;
  roadScene: string;
  stopScene: string;
  smallScene: string;
  momentsCopy: string;
};

const defaultCopy: ShareStoryCopy = {
  defaultTitle: "A Day Worth Keeping",
  fallbackRoute: "today's route",
  changingWeather: "changing weather",
  rangeTitle: "{start} to {end}",
  subtitle: "{temp} across {route}.",
  defaultSeed: "Today unfolded along {route}, with {temp} setting the rhythm.",
  bodyMiddle:
    "The day moved in clean scenes: morning logistics, changing light, small stops that made the map feel human, and an evening arrival with a different kind of quiet.",
  bodyPrivacy:
    "Only the shareable parts are here: city-level route, weather, selected photos, and the feeling of the day. The private itinerary stays local.",
  closing: "Created from a private local itinerary, shared only with selected moments.",
  firstScene: "The first scene of the day.",
  roadScene: "Road time, changing light, and a wider horizon.",
  stopScene: "A stop worth slowing down for.",
  smallScene: "A small marker in the day's rhythm.",
  momentsCopy: "From {start} to {end}.\n{temp}\nThis is the quiet story link."
};

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function titleForRoute(routeLabel: string | undefined, fallback: string) {
  const places = routeLabel?.split("->").map((label) => label.trim()).filter(Boolean) ?? [];
  if (places.length >= 2) {
    return `${places[0]} to ${places.at(-1)}`;
  }
  return fallback;
}

function subtitleForTemp(temp: string, route: string, copy: ShareStoryCopy) {
  return fill(copy.subtitle, { temp, route });
}

function storyBody(seed: string | undefined, route: string, temp: string, copy: ShareStoryCopy) {
  const firstLine = seed?.trim()
    ? seed.trim()
    : fill(copy.defaultSeed, { route, temp });

  return `${firstLine}

${copy.bodyMiddle}

${copy.bodyPrivacy}`;
}

export function buildShareStory(input: {
  trip: Trip;
  dayIds: string[];
  theme: ShareTheme;
  seedText?: string;
  copy?: ShareStoryCopy;
}): ShareStory {
  const policy = defaultSharePolicy;
  const copy = input.copy ?? defaultCopy;
  const sourceDays = input.trip.days.filter((day) => input.dayIds.includes(day.id));
  const days = sourceDays.map((sourceDay) => {
    const day = sanitizeDayForShare(sourceDay, policy);
    const photos = selectedSharePhotos(sourceDay, policy);
    const timeline = publicSchedule(sourceDay, policy).map((item, index) => ({
      time: item.time,
      title: item.title,
      locationLabel: item.location ?? sourceDay.city,
      description:
        index === 0
          ? copy.firstScene
          : item.type === "drive"
            ? copy.roadScene
            : item.type === "attraction"
              ? copy.stopScene
              : copy.smallScene,
      photoIds: photos[index] ? [photos[index].id] : undefined,
      weather: sourceDay.weather?.description,
      temperature: sourceDay.weather?.highC ? `${sourceDay.weather.highC}C` : undefined
    }));

    return {
      date: day.date,
      title: titleForRoute(day.routeLabel, day.title || copy.defaultTitle),
      routeLabel: day.routeLabel ?? day.city,
      cityLabels: day.routeLabel?.split("->").map((label) => label.trim()) ?? [day.city],
      weatherLabel: day.weather?.description,
      temperatureRange:
        day.weather?.lowC !== undefined && day.weather.highC !== undefined
          ? `${day.weather.lowC}-${day.weather.highC}C`
          : undefined,
      timeline,
      summary: `${day.city} | ${day.weather?.description ?? "Travel day"}`,
      photos,
      distanceKm: day.route?.distanceKm
    };
  });

  const first = days[0];
  const last = days.at(-1) ?? first;
  const route = days.map((day) => day.routeLabel).filter(Boolean).join(" / ") || copy.fallbackRoute;
  const temp = days
    .map((day) => day.temperatureRange)
    .filter(Boolean)
    .join(", ");
  const tempLabel = temp || copy.changingWeather;
  const title =
    days.length === 1
      ? first?.title ?? copy.defaultTitle
      : fill(copy.rangeTitle, {
          start: first?.cityLabels[0] ?? input.trip.name,
          end: last?.cityLabels.at(-1) ?? input.trip.name
        });
  const body = storyBody(input.seedText, route, tempLabel, copy);
  const memoryBody = body;

  return {
    id: makeId("story"),
    tripId: input.trip.id,
    title,
    subtitle: subtitleForTemp(tempLabel, route, copy),
    authorTag: "@ Lostravelerk",
    dateRange: {
      start: sourceDays[0]?.date ?? input.trip.startDate,
      end: sourceDays.at(-1)?.date ?? input.trip.endDate
    },
    days,
    theme: input.theme,
    userSeedText: input.seedText,
    memoryIntro: input.seedText || title,
    memoryBody,
    memoryClosing: copy.closing,
    selectedPhotoIds: days.flatMap((day) => day.photos?.map((photo) => photo.id) ?? []),
    sharePolicy: policy,
    isPublished: true,
    createdAt: new Date().toISOString(),
    momentsCopy: fill(copy.momentsCopy, {
      start: first?.cityLabels[0] ?? input.trip.name,
      end: last?.cityLabels.at(-1) ?? input.trip.name,
      temp: tempLabel
    })
  };
}
