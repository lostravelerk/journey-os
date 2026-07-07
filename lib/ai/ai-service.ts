import type {
  AiRequest,
  AiResponse,
  FutureInspirationInput,
  JourneyImportInput,
  MemoryLineInput,
  MomentReflectionInput,
  StoryDraftInput
} from "@/lib/ai/types";

function compact(value: string, fallback: string) {
  const text = value.trim();
  if (!text) return fallback;
  return text.length > 48 ? `${text.slice(0, 46)}...` : text;
}

export function mockAiResponse(request: AiRequest): AiResponse {
  switch (request.type) {
    case "memory_line":
      return {
        result: compact(request.input.text, "留下这一刻。"),
        draft: true,
        generated: true,
        provider: "mock"
      };
    case "moment_reflection":
      return {
        result: compact(request.input.text, "稍后再整理也可以。"),
        draft: true,
        generated: true,
        provider: "mock"
      };
    case "future_inspiration":
      return {
        result: request.input.place
          ? `${request.input.place} 附近，也许有一段值得慢慢靠近的下一程。`
          : "下一程可以先保持空白，等真正想去的地方出现。",
        draft: true,
        generated: true,
        provider: "mock"
      };
    case "journey_import":
      return {
        result: "我先把这些信息整理成未来旅程草稿。确认后，再带入 JourneyOS。",
        draft: true,
        generated: true,
        provider: "mock"
      };
    case "story_draft":
      return {
        result: compact(request.input.memories.filter(Boolean).join(" "), "这些 Moment 可以慢慢形成一个故事。"),
        draft: true,
        generated: true,
        provider: "mock"
      };
    default:
      return {
        result: "稍后再整理也可以。",
        draft: true,
        generated: true,
        provider: "mock"
      };
  }
}

export async function requestJourneyAi(request: AiRequest): Promise<AiResponse> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error("JourneyOS AI is unavailable");
    }

    return (await response.json()) as AiResponse;
  } catch {
    return mockAiResponse(request);
  }
}

export async function generateMemoryLine(input: MemoryLineInput) {
  return (await requestJourneyAi({ type: "memory_line", input })).result;
}

export async function generateMomentReflection(input: MomentReflectionInput) {
  return (await requestJourneyAi({ type: "moment_reflection", input })).result;
}

export async function generateFutureInspiration(input: FutureInspirationInput) {
  return (await requestJourneyAi({ type: "future_inspiration", input })).result;
}

export async function parseJourneyImport(input: JourneyImportInput) {
  return (await requestJourneyAi({ type: "journey_import", input })).result;
}

export async function generateStoryDraft(input: StoryDraftInput) {
  return (await requestJourneyAi({ type: "story_draft", input })).result;
}
