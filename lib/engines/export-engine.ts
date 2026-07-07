import { Journey, JourneyBook } from "@/lib/domain";
import { visibleTimeline } from "@/lib/engines/timeline-engine";
import { escapeHtml, formatDate, formatDateRange } from "@/lib/utils";

export type JourneyBookVisibility = "private" | "share-safe";
export type JourneyBookCopy = {
  journeyDay: string;
  fallbackDayTitle: string;
  privateMemoryBook: string;
  shareSafeMemoryBook: string;
  titleSuffix: string;
  footer: string;
};

type JourneyBookOptions = {
  copy?: JourneyBookCopy;
  formatDate?: (value: string) => string;
  formatDateRange?: (start: string, end: string) => string;
  lang?: string;
};

const defaultCopy: JourneyBookCopy = {
  journeyDay: "Day {number}",
  fallbackDayTitle: "Journey Day",
  privateMemoryBook: "Private memory book",
  shareSafeMemoryBook: "Share-safe memory book",
  titleSuffix: "Journey Book",
  footer: "Keep the journey. Not the noise."
};

function eventsForBook(journeyDay: Journey["days"][number], visibility: JourneyBookVisibility) {
  return visibility === "private" ? journeyDay.events : visibleTimeline(journeyDay);
}

function memoriesForBook(journeyDay: Journey["days"][number], visibility: JourneyBookVisibility) {
  return visibility === "private"
    ? journeyDay.memories
    : journeyDay.memories.filter((memory) => memory.visibility !== "private");
}

function photosForBook(journeyDay: Journey["days"][number], visibility: JourneyBookVisibility) {
  return visibility === "private"
    ? journeyDay.photos
    : journeyDay.photos.filter((photo) => photo.selectedForStory && photo.visibility !== "private");
}

export function buildJourneyBookHtml(journey: Journey, visibility: JourneyBookVisibility, options: JourneyBookOptions = {}): string {
  const isPrivate = visibility === "private";
  const copy = options.copy ?? defaultCopy;
  const formatDateValue = options.formatDate ?? formatDate;
  const formatDateRangeValue = options.formatDateRange ?? formatDateRange;
  const body = journey.days
    .map((day) => {
      const events = eventsForBook(day, visibility)
        .map(
          (event) =>
            `<li><span>${escapeHtml(event.time ?? "")}</span><strong>${escapeHtml(event.title)}</strong><em>${escapeHtml(event.place?.name ?? "")}</em></li>`
        )
        .join("");
      const memories = memoriesForBook(day, visibility)
        .map((memory) => `<p>${escapeHtml(memory.refinedContent ?? memory.content)}</p>`)
        .join("");
      const photos = photosForBook(day, visibility)
        .slice(0, 6)
        .map((photo) => `<img src="${escapeHtml(photo.localUrl ?? "")}" alt="${escapeHtml(photo.caption ?? day.title ?? journey.title)}" />`)
        .join("");

      return `<section>
        <div class="day-kicker">${escapeHtml(copy.journeyDay.replace("{number}", String(day.dayNumber)))} | ${escapeHtml(formatDateValue(day.date))}</div>
        <h2>${escapeHtml(day.title ?? day.primaryPlace?.name ?? copy.fallbackDayTitle)}</h2>
        <p class="route">${escapeHtml(day.routeLabel ?? day.primaryPlace?.name ?? "")}</p>
        ${events ? `<ul>${events}</ul>` : ""}
        ${photos ? `<div class="photos">${photos}</div>` : ""}
        ${memories ? `<div class="notes">${memories}</div>` : ""}
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${escapeHtml(options.lang ?? "en")}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(journey.title)} ${escapeHtml(copy.titleSuffix)}</title>
  <style>
    :root { color-scheme: light; --ink: #171916; --paper: #f6f7f3; --muted: #687068; --line: rgba(23,25,22,.11); }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: var(--paper); }
    header { min-height: 72vh; display: grid; align-content: end; padding: 8vw; background: linear-gradient(180deg, rgba(17,19,17,.18), rgba(17,19,17,.86)), url("https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80") center/cover; color: white; }
    header p { max-width: 680px; color: rgba(255,255,255,.76); font-size: 18px; line-height: 1.6; }
    h1 { font-size: clamp(44px, 9vw, 112px); line-height: .9; margin: 0 0 18px; letter-spacing: 0; }
    main { max-width: 1040px; margin: 0 auto; padding: 8vw 24px; }
    section { padding: 42px 0; border-bottom: 1px solid var(--line); }
    h2 { font-size: clamp(32px, 6vw, 64px); line-height: 1; margin: 10px 0; letter-spacing: 0; }
    .day-kicker, .route, li span, li em, footer { color: var(--muted); }
    ul { list-style: none; padding: 0; margin: 28px 0; display: grid; gap: 10px; }
    li { display: grid; grid-template-columns: 70px 1fr; gap: 14px; align-items: baseline; }
    li strong { font-weight: 600; }
    li em { font-style: normal; }
    .photos { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; box-shadow: 0 18px 50px rgba(0,0,0,.15); }
    .notes { margin-top: 24px; color: #3f3a32; }
    footer { padding: 36px 8vw 60px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <div>
      <div>JourneyOS</div>
      <h1>${escapeHtml(journey.title)}</h1>
      <p>${escapeHtml(formatDateRangeValue(journey.startDate, journey.endDate))} | ${escapeHtml(isPrivate ? copy.privateMemoryBook : copy.shareSafeMemoryBook)}</p>
    </div>
  </header>
  <main>${body}</main>
  <footer>${escapeHtml(copy.footer)}</footer>
</body>
</html>`;
}

export function createJourneyBook(journey: Journey, visibility: JourneyBookVisibility): JourneyBook {
  return {
    id: `book_${Date.now()}`,
    journeyId: journey.id,
    title: `${journey.title} ${defaultCopy.titleSuffix}`,
    html: buildJourneyBookHtml(journey, visibility),
    createdAt: new Date().toISOString()
  };
}
