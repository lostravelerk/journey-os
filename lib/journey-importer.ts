import { createBlankJourneyTrip } from "@/lib/journey-factory";
import { JourneyDay, ScheduleItem, Trip } from "@/lib/schema";

type CellValue = string | number | boolean | Date | null | undefined;

type ImportedRow = {
  date?: string;
  dayNumber?: number;
  title?: string;
  city?: string;
  routeLabel?: string;
  time?: string;
  location?: string;
  hotel?: string;
  note?: string;
  type?: ScheduleItem["type"];
};

const headerMap: Record<keyof ImportedRow, string[]> = {
  date: ["date", "日期", "时间日期", "出发日期"],
  dayNumber: ["day", "天", "第几天", "日程"],
  title: ["title", "activity", "plan", "itinerary", "安排", "行程", "活动", "事项", "内容"],
  city: ["city", "城市", "地点", "目的地", "区域"],
  routeLabel: ["route", "路线", "行驶路线", "交通", "行程路线"],
  time: ["time", "时间", "时刻"],
  location: ["location", "place", "地点", "地址", "位置"],
  hotel: ["hotel", "酒店", "住宿"],
  note: ["note", "notes", "备注", "说明", "memo"],
  type: ["type", "类型", "类别"]
};

function text(value: CellValue) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalizeHeader(value: CellValue) {
  return text(value).toLowerCase().replace(/\s+/g, "");
}

function excelDate(value: number) {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
  return epoch.toISOString().slice(0, 10);
}

function parseDate(value: CellValue): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20000 && value < 60000) return excelDate(value);

  const raw = text(value);
  if (!raw) return undefined;
  const normalized = raw
    .replace(/[年月.]/g, "-")
    .replace(/[日号]/g, "")
    .replace(/\//g, "-")
    .trim();
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);

  const monthDay = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (monthDay) {
    const [, month, day] = monthDay;
    return `2026-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return undefined;
}

function inferType(value?: string): ScheduleItem["type"] {
  const raw = (value ?? "").toLowerCase();
  if (/flight|航班|机场|飞/.test(raw)) return "flight";
  if (/drive|road|自驾|开车|出发/.test(raw)) return "drive";
  if (/hotel|酒店|住宿|入住/.test(raw)) return "hotel";
  if (/breakfast|早餐/.test(raw)) return "breakfast";
  if (/lunch|午餐|午饭/.test(raw)) return "lunch";
  if (/dinner|晚餐|晚饭/.test(raw)) return "dinner";
  if (/coffee|咖啡/.test(raw)) return "coffee";
  if (/meeting|客户|supplier|供应商|会议/.test(raw)) return "meeting";
  if (/exhibition|展会|展览|cosmoprof/.test(raw)) return "exhibition";
  if (/free|自由/.test(raw)) return "free";
  return "attraction";
}

function findHeaderRow(rows: CellValue[][]) {
  let bestIndex = 0;
  let bestScore = 0;

  rows.slice(0, 12).forEach((row, index) => {
    const headers = row.map(normalizeHeader);
    const score = Object.values(headerMap).reduce(
      (count, candidates) => count + (headers.some((header) => candidates.some((candidate) => header.includes(candidate.toLowerCase()))) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : -1;
}

function indexFor(headers: CellValue[], field: keyof ImportedRow) {
  const normalized = headers.map(normalizeHeader);
  return normalized.findIndex((header) => headerMap[field].some((candidate) => header.includes(candidate.toLowerCase())));
}

function rowFromHeader(row: CellValue[], headers: CellValue[]): ImportedRow {
  const get = (field: keyof ImportedRow) => {
    const index = indexFor(headers, field);
    return index >= 0 ? row[index] : undefined;
  };

  return {
    date: parseDate(get("date")),
    dayNumber: Number(text(get("dayNumber")).replace(/\D/g, "")) || undefined,
    title: text(get("title")),
    city: text(get("city")),
    routeLabel: text(get("routeLabel")),
    time: text(get("time")),
    location: text(get("location")),
    hotel: text(get("hotel")),
    note: text(get("note")),
    type: inferType(text(get("type")) || text(get("title")))
  };
}

function rowWithoutHeader(row: CellValue[], index: number): ImportedRow {
  const cells = row.map(text).filter(Boolean);
  const date = row.map(parseDate).find(Boolean);
  const title = cells.find((cell) => !parseDate(cell)) ?? `Day ${index + 1}`;

  return {
    date,
    dayNumber: index + 1,
    title,
    city: cells[1],
    routeLabel: cells.find((cell) => cell.includes("->") || cell.includes("→")),
    note: cells.slice(2).join(" / "),
    type: inferType(cells.join(" "))
  };
}

function parseRows(rows: CellValue[][]): ImportedRow[] {
  const headerIndex = findHeaderRow(rows);
  if (headerIndex >= 0) {
    const headers = rows[headerIndex];
    return rows
      .slice(headerIndex + 1)
      .map((row) => rowFromHeader(row, headers))
      .filter((row) => row.date || row.title || row.city || row.routeLabel || row.note);
  }

  return rows
    .map(rowWithoutHeader)
    .filter((row) => row.date || row.title || row.city || row.routeLabel || row.note);
}

function scheduleFromRow(row: ImportedRow, tripId: string, dayId: string, index: number): ScheduleItem | undefined {
  if (!row.title && !row.note && !row.location) return undefined;
  const title = row.title || row.note || row.location || "Journey moment";
  const type = row.type ?? inferType(title);

  return {
    id: `${dayId}_import_${index + 1}`,
    time: row.time,
    title,
    type,
    location: row.location || row.city,
    notes: row.note,
    visibility: type === "flight" || type === "meeting" || type === "hotel" ? "private" : "shareable"
  };
}

function buildTrip(rows: ImportedRow[], fallbackTitle: string): Trip {
  const datedRows = rows.length ? rows : [{ title: fallbackTitle, date: new Date().toISOString().slice(0, 10) }];
  const dates = Array.from(new Set(datedRows.map((row) => row.date).filter(Boolean))) as string[];
  const startDate = dates[0] ?? new Date().toISOString().slice(0, 10);
  const endDate = dates.at(-1) ?? startDate;
  const trip = createBlankJourneyTrip({ title: fallbackTitle, startDate, endDate });

  const grouped = new Map<string, ImportedRow[]>();
  datedRows.forEach((row, index) => {
    const date = row.date ?? trip.days[index]?.date ?? startDate;
    grouped.set(date, [...(grouped.get(date) ?? []), row]);
  });

  const importedDays: JourneyDay[] = Array.from(grouped.entries()).map(([date, dayRows], dayIndex) => {
    const base = trip.days[dayIndex] ?? trip.days.at(-1)!;
    const first = dayRows[0] ?? {};
    const dayId = base.id;
    const schedule = dayRows
      .map((row, index) => scheduleFromRow(row, trip.id, dayId, index))
      .filter(Boolean) as ScheduleItem[];

    return {
      ...base,
      id: dayId,
      tripId: trip.id,
      dayNumber: dayIndex + 1,
      date,
      title: first.title || first.routeLabel || first.city || `Day ${dayIndex + 1}`,
      city: first.city || first.location || "Place to remember",
      routeLabel: first.routeLabel || first.city || first.title || `Day ${dayIndex + 1}`,
      hotel: first.hotel
        ? {
            name: first.hotel,
            visibility: "private"
          }
        : undefined,
      schedule,
      notes: dayRows
        .filter((row) => row.note)
        .map((row, index) => ({
          id: `${dayId}_note_${index + 1}`,
          type: "memory" as const,
          content: row.note!,
          createdAt: new Date().toISOString(),
          visibility: "private" as const
        }))
    };
  });

  return {
    ...trip,
    startDate: importedDays[0]?.date ?? trip.startDate,
    endDate: importedDays.at(-1)?.date ?? trip.endDate,
    days: importedDays.length ? importedDays : trip.days
  };
}

function parseCsv(textValue: string): CellValue[][] {
  return textValue
    .split(/\r?\n/)
    .map((line) => line.split(/,|\t/).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function parsePlainText(textValue: string): CellValue[][] {
  return textValue
    .split(/\r?\n/)
    .map((line) => [line.trim()])
    .filter((row) => row[0]);
}

function tripFromJson(value: unknown, fallbackTitle: string): Trip {
  const input = value as { trip?: Trip; trips?: Trip[]; name?: string; title?: string; days?: unknown[] };
  if (input.trip?.days) return input.trip;
  if (input.trips?.[0]?.days) return input.trips[0];
  if (Array.isArray(input.days)) {
    return {
      ...createBlankJourneyTrip({ title: input.title ?? input.name ?? fallbackTitle }),
      ...input,
      name: input.title ?? input.name ?? fallbackTitle
    } as Trip;
  }
  return createBlankJourneyTrip({ title: fallbackTitle });
}

export async function parseJourneyFile(file: File): Promise<Trip> {
  const fallbackTitle = file.name.replace(/\.[^.]+$/, "") || "Imported Journey";
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "json") {
    return tripFromJson(JSON.parse(await file.text()), fallbackTitle);
  }

  if (extension === "csv" || extension === "tsv") {
    return buildTrip(parseRows(parseCsv(await file.text())), fallbackTitle);
  }

  if (extension === "txt" || extension === "md") {
    return buildTrip(parseRows(parsePlainText(await file.text())), fallbackTitle);
  }

  if (extension === "xlsx" || extension === "xls") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const rows = workbook.SheetNames.flatMap((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json<CellValue[]>(sheet, { header: 1, defval: "" });
    });
    return buildTrip(parseRows(rows), fallbackTitle);
  }

  return buildTrip(parseRows(parsePlainText(await file.text())), fallbackTitle);
}
