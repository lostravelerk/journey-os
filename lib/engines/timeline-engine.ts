import { JourneyDay, JourneyEvent } from "@/lib/domain";

export function visibleTimeline(day: JourneyDay): JourneyEvent[] {
  return day.events.filter((event) => event.visibility !== "private");
}

export function privateTimeline(day: JourneyDay): JourneyEvent[] {
  return day.events;
}

export function firstTimedEvent(day: JourneyDay): JourneyEvent | undefined {
  return day.events.find((event) => event.time) ?? day.events[0];
}
