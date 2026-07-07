import type { AiRequest, AiResponse } from "./types";

const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export type DeepSeekFetch = typeof fetch;

const systemPrompt = [
  "You are the quiet intelligence layer for JourneyOS.",
  "JourneyOS is a local-first personal Journey Memory OS.",
  "The product core is Moment, not AI.",
  "Write in the user's language when obvious. Default to simplified Chinese.",
  "Style: calm, restrained, natural, truthful, minimal.",
  "Avoid motivational slogans, travel-guide tone, marketing copy, over-literary writing, and excessive detail.",
  "Never claim a future event has happened.",
  "Return only the requested draft text. Do not explain your process."
].join("\n");

function clip(value: string, maxLength = 6000) {
  return value.trim().slice(0, maxLength);
}

function buildTaskPrompt(request: AiRequest) {
  switch (request.type) {
    case "memory_line":
      return [
        "Task: create one short Memory Line for this Moment.",
        "Length: one sentence, preferably under 24 Chinese characters or 14 English words.",
        "It must feel real, not poetic performance.",
        `Time: ${request.input.time ?? "unknown"}`,
        `Place: ${request.input.place ?? "unknown"}`,
        `Raw memory: ${clip(request.input.text, 1200)}`
      ].join("\n");
    case "moment_reflection":
      return [
        "Task: gently organize this Moment reflection.",
        "Keep the user's meaning. Do not invent facts.",
        "Length: 2-4 short lines.",
        `Time: ${request.input.time ?? "unknown"}`,
        `Place: ${request.input.place ?? "unknown"}`,
        `Raw text: ${clip(request.input.text, 1800)}`
      ].join("\n");
    case "future_inspiration":
      return [
        "Task: suggest a few possible future Journey moments.",
        "These are possibilities, not plans and not memories.",
        "Use quiet language. Keep each suggestion specific and light.",
        `Place: ${request.input.place ?? "unknown"}`,
        `Preferences: ${(request.input.preferences ?? []).join(", ") || "unknown"}`,
        `Context: ${clip(request.input.text ?? "", 1800)}`
      ].join("\n");
    case "journey_import":
      return [
        "Task: understand this imported future journey material.",
        "Convert messy text into a calm Future Journey draft.",
        "Do not write as if anything has happened.",
        "Separate confirmed items from suggestions when possible.",
        `Source: ${request.input.sourceName ?? "unknown"}`,
        `Material: ${clip(request.input.text)}`
      ].join("\n");
    case "story_draft":
      return [
        "Task: draft a quiet Journey story from confirmed memories.",
        "Keep emotion, remove noise, do not add facts.",
        `Title: ${request.input.title ?? "untitled"}`,
        `Route: ${request.input.route ?? "unknown"}`,
        `Memories:\n${clip(request.input.memories.join("\n"))}`
      ].join("\n");
    default:
      return "";
  }
}

function buildMessages(request: AiRequest): DeepSeekMessage[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildTaskPrompt(request) }
  ];
}

export async function runDeepSeekAi(
  request: AiRequest,
  apiKey: string | undefined,
  fetchImpl: DeepSeekFetch = fetch
): Promise<AiResponse> {
  if (!apiKey) {
    throw new Error("Missing DeepSeek API key");
  }

  const response = await fetchImpl(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.35,
      max_tokens: 700,
      messages: buildMessages(request)
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed: ${response.status}`);
  }

  const data = (await response.json()) as DeepSeekCompletion;
  const result = data.choices?.[0]?.message?.content?.trim();
  if (!result) {
    throw new Error("DeepSeek returned an empty response");
  }

  return {
    result,
    draft: true,
    generated: true,
    provider: "deepseek"
  };
}
