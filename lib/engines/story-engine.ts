import { Journey, Story } from "@/lib/domain";
import { primaryMemory } from "@/lib/engines/memory-engine";
import { storyPhotos } from "@/lib/engines/photo-engine";

export function createJourneyStoryDraft(input: {
  journey: Journey;
  dayIds: string[];
  seedText?: string;
  theme?: Story["theme"];
}): Story {
  const days = input.journey.days.filter((day) => input.dayIds.includes(day.id));
  const firstDay = days[0];
  const route = days.map((day) => day.routeLabel ?? day.primaryPlace?.name).filter(Boolean).join(" / ");
  const memory = firstDay ? primaryMemory(firstDay) : undefined;

  return {
    id: `story_${Date.now()}`,
    journeyId: input.journey.id,
    dayIds: days.map((day) => day.id),
    title: firstDay?.title ?? input.journey.title,
    subtitle: route || input.journey.subtitle,
    intro: input.seedText ?? memory?.content,
    body: input.seedText ?? memory?.content,
    closing: "Shared only with selected journey memories.",
    photoIds: days.flatMap((day) => storyPhotos(day).map((photo) => photo.id)),
    theme: input.theme ?? "soft_journal",
    visibility: "shareable",
    createdAt: new Date().toISOString()
  };
}
