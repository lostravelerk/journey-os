import { requestJourneyIntelligence } from "@/lib/intelligence/intelligence-service";
import { parseJourneyFile, parseJourneyText, structuredJourneyImportExtensions } from "@/lib/journey-importer";
import { Trip } from "@/lib/schema";

export type FutureJourneySourceKind = "structured" | "visual" | "document" | "text";

export type FutureJourneyAnalysis = {
  trip: Trip;
  sourceName: string;
  sourceKind: FutureJourneySourceKind;
  aiDraft: string;
  aiProvider: "deepseek" | "mock";
  summary: {
    days: number;
    plannedNodes: number;
    places: string[];
    missingStayDays: number;
  };
};

function extensionFor(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function sourceKindFor(file: File): FutureJourneySourceKind {
  const extension = extensionFor(file);
  if (structuredJourneyImportExtensions.includes(extension)) return "structured";
  if (["png", "jpg", "jpeg", "webp", "heic", "heif"].includes(extension)) return "visual";
  return "document";
}

function draftTextFromFile(file: File) {
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return `${new Date().toISOString().slice(0, 10)} ${name}`;
}

function summarize(trip: Trip): FutureJourneyAnalysis["summary"] {
  const places = Array.from(
    new Set(
      trip.days
        .flatMap((day) => [day.city, day.route?.start, day.route?.end, day.routeLabel])
        .filter((value): value is string => Boolean(value))
        .map((value) => value.replace(/\s*->\s*/g, " → "))
    )
  ).slice(0, 6);

  return {
    days: trip.days.length,
    plannedNodes: trip.days.reduce((count, day) => count + day.schedule.length, 0),
    places,
    missingStayDays: trip.days.filter((day) => !day.hotel).length
  };
}

function materialFromTrip(trip: Trip) {
  return trip.days
    .map((day) => {
      const schedule = day.schedule.map((item) => `${item.time} ${item.title} ${item.location ?? ""}`.trim()).join("; ");
      return [day.date, day.routeLabel || day.title, day.city, schedule].filter(Boolean).join(" · ");
    })
    .join("\n");
}

async function draftWithAi(input: { trip: Trip; sourceName: string; text?: string }) {
  const material = input.text?.trim() || materialFromTrip(input.trip) || input.sourceName;
  return requestJourneyIntelligence({
    type: "journey_import",
    input: {
      text: material,
      sourceName: input.sourceName
    }
  });
}

export async function analyzeFutureJourneyInput(input: { file?: File; text?: string }): Promise<FutureJourneyAnalysis> {
  const cleanText = input.text?.trim();

  if (input.file) {
    const sourceKind = sourceKindFor(input.file);
    const trip =
      sourceKind === "structured"
        ? await parseJourneyFile(input.file)
        : parseJourneyText(cleanText || draftTextFromFile(input.file), input.file.name.replace(/\.[^.]+$/, "") || "Future Journey");
    const aiDraft = await draftWithAi({ trip, sourceName: input.file.name, text: cleanText });

    return {
      trip,
      sourceName: input.file.name,
      sourceKind,
      aiDraft: aiDraft.result,
      aiProvider: aiDraft.provider,
      summary: summarize(trip)
    };
  }

  const trip = parseJourneyText(cleanText || "Future Journey", "Future Journey");
  const aiDraft = await draftWithAi({ trip, sourceName: "Text", text: cleanText });
  return {
    trip,
    sourceName: "Text",
    sourceKind: "text",
    aiDraft: aiDraft.result,
    aiProvider: aiDraft.provider,
    summary: summarize(trip)
  };
}
