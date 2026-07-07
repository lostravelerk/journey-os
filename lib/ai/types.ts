export const aiRequestTypes = [
  "memory_line",
  "moment_reflection",
  "future_inspiration",
  "journey_import",
  "story_draft"
] as const;

export type AiRequestType = (typeof aiRequestTypes)[number];

export type MemoryLineInput = {
  text: string;
  place?: string;
  time?: string;
};

export type MomentReflectionInput = {
  text: string;
  place?: string;
  time?: string;
};

export type FutureInspirationInput = {
  text?: string;
  place?: string;
  preferences?: string[];
};

export type JourneyImportInput = {
  text: string;
  sourceName?: string;
};

export type StoryDraftInput = {
  memories: string[];
  title?: string;
  route?: string;
};

export type AiRequest =
  | { type: "memory_line"; input: MemoryLineInput }
  | { type: "moment_reflection"; input: MomentReflectionInput }
  | { type: "future_inspiration"; input: FutureInspirationInput }
  | { type: "journey_import"; input: JourneyImportInput }
  | { type: "story_draft"; input: StoryDraftInput };

export type AiProvider = "deepseek" | "mock";

export type AiResponse = {
  result: string;
  draft: true;
  generated: true;
  provider: AiProvider;
};

export function isAiRequest(value: unknown): value is AiRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; input?: unknown };
  if (typeof candidate.type !== "string" || !aiRequestTypes.includes(candidate.type as AiRequestType)) {
    return false;
  }
  if (!candidate.input || typeof candidate.input !== "object") return false;

  const input = candidate.input as Record<string, unknown>;
  if (candidate.type === "memory_line" || candidate.type === "moment_reflection") {
    return typeof input.text === "string" && input.text.trim().length > 0;
  }
  if (candidate.type === "future_inspiration") {
    return (
      (input.text === undefined || typeof input.text === "string") &&
      (input.place === undefined || typeof input.place === "string") &&
      (input.preferences === undefined ||
        (Array.isArray(input.preferences) && input.preferences.every((item) => typeof item === "string")))
    );
  }
  if (candidate.type === "journey_import") {
    return typeof input.text === "string" && input.text.trim().length > 0;
  }
  if (candidate.type === "story_draft") {
    return Array.isArray(input.memories) && input.memories.every((item) => typeof item === "string");
  }
  return false;
}
