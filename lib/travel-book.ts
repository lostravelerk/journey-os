import { buildJourneyBookHtml, JourneyBookCopy, JourneyBookVisibility } from "@/lib/engines/export-engine";
import { toJourney } from "@/lib/journey-adapter";
import { Trip } from "@/lib/schema";

export type TravelBookVisibility = JourneyBookVisibility;

export function buildTravelBookHtml(
  trip: Trip,
  visibility: TravelBookVisibility,
  options?: {
    copy?: JourneyBookCopy;
    formatDate?: (value: string) => string;
    formatDateRange?: (start: string, end: string) => string;
    lang?: string;
  }
) {
  return buildJourneyBookHtml(toJourney(trip), visibility, options);
}
