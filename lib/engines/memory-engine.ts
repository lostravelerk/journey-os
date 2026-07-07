import { JourneyDay, Memory } from "@/lib/domain";

export function primaryMemory(day: JourneyDay): Memory | undefined {
  return day.memories.find((memory) => memory.content.trim()) ?? day.memories[0];
}

export function shareableMemories(day: JourneyDay): Memory[] {
  return day.memories.filter((memory) => memory.visibility === "shareable" || memory.visibility === "public");
}

export function createMemory(input: {
  journeyId: string;
  dayId: string;
  content?: string;
}): Memory {
  return {
    id: `memory_${Date.now()}`,
    journeyId: input.journeyId,
    dayId: input.dayId,
    content: input.content ?? "",
    createdAt: new Date().toISOString(),
    visibility: "private"
  };
}
