import { parseJourneyFile, parseJourneyText, structuredJourneyImportExtensions } from "@/lib/journey-importer";
import { Trip } from "@/lib/schema";

export type FutureJourneySourceKind = "structured" | "visual" | "document" | "text";

export type FutureJourneyAnalysis = {
  trip: Trip;
  sourceName: string;
  sourceKind: FutureJourneySourceKind;
  mockAi: true;
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

export async function analyzeFutureJourneyInput(input: { file?: File; text?: string }): Promise<FutureJourneyAnalysis> {
  const cleanText = input.text?.trim();

  if (input.file) {
    const sourceKind = sourceKindFor(input.file);
    const trip =
      sourceKind === "structured"
        ? await parseJourneyFile(input.file)
        : parseJourneyText(cleanText || draftTextFromFile(input.file), input.file.name.replace(/\.[^.]+$/, "") || "Future Journey");

    return {
      trip,
      sourceName: input.file.name,
      sourceKind,
      mockAi: true,
      summary: summarize(trip)
    };
  }

  const trip = parseJourneyText(cleanText || "Future Journey", "Future Journey");
  return {
    trip,
    sourceName: "Text",
    sourceKind: "text",
    mockAi: true,
    summary: summarize(trip)
  };
}
