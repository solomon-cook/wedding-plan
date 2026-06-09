import type { PositionedEntry, TimelineEntry, TimelineScale } from "../types/timeline";

export const WEDDING_DATE = "2026-07-11";
export const TIMELINE_START_DATE = "2026-07-09";
export const TIMELINE_LAST_ENTRY_DATE = "2026-07-12";
export const TIMELINE_END_DATE = "2026-07-13";

const MINUTES_PER_DAY = 24 * 60;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_DURATION_MINUTES = 15;
const DEFAULT_PIXELS_PER_MINUTE = 2.8;
const MIN_ENTRY_WIDTH = 42;
const MIN_VISUAL_GAP_PX = 96;
const TIMELINE_START_MINUTE = getDateOffsetMinutes(TIMELINE_START_DATE);
const TIMELINE_END_MINUTE = getDateOffsetMinutes(TIMELINE_END_DATE);

function getDateOffsetMinutes(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [startYear, startMonth, startDay] = TIMELINE_START_DATE.split("-").map(Number);
  const dateTime = Date.UTC(year, month - 1, day);
  const startTime = Date.UTC(startYear, startMonth - 1, startDay);
  return Math.round((dateTime - startTime) / 60000);
}

export function normaliseEntryDate(date?: string): string {
  return date && DATE_PATTERN.test(date) ? date : WEDDING_DATE;
}

export function parseTimeToMinutes(time?: string): number | null {
  if (!time) {
    return null;
  }

  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function formatMinutesAsTime(minutes: number): string {
  const dayMinutes = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(dayMinutes / 60);
  const mins = dayMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatMinutesAsDay(minutes: number): string {
  const date = new Date(Date.UTC(2026, 6, 9) + minutes * 60000);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatTimelineTick(minutes: number): string {
  if (minutes % MINUTES_PER_DAY === 0) {
    return formatMinutesAsDay(minutes);
  }

  return formatMinutesAsTime(minutes);
}

export function formatEntryDate(entry: TimelineEntry): string {
  return formatMinutesAsDay(getDateOffsetMinutes(normaliseEntryDate(entry.date)));
}

export function formatEntryDateTime(entry: TimelineEntry): string {
  return `${formatEntryDate(entry)} · ${entry.startTime}`;
}

export function getEntryStartMinute(entry: TimelineEntry): number {
  const time = parseTimeToMinutes(entry.startTime);
  return getDateOffsetMinutes(normaliseEntryDate(entry.date)) + (time ?? 0);
}

export function getEntryDurationMinutes(entry: TimelineEntry): number {
  const start = getEntryStartMinute(entry);
  const endTime = parseTimeToMinutes(entry.endTime);
  const end = endTime === null ? null : getDateOffsetMinutes(normaliseEntryDate(entry.date)) + endTime;

  if (start !== null && end !== null && end > start) {
    return end - start;
  }

  if (entry.durationMinutes && entry.durationMinutes > 0) {
    return entry.durationMinutes;
  }

  return DEFAULT_DURATION_MINUTES;
}

export function getEntryEndMinute(entry: TimelineEntry): number {
  const start = getEntryStartMinute(entry);
  return start + getEntryDurationMinutes(entry);
}

export function createTimelineScale(): TimelineScale {
  return {
    startMinute: TIMELINE_START_MINUTE,
    endMinute: TIMELINE_END_MINUTE,
    pixelsPerMinute: DEFAULT_PIXELS_PER_MINUTE,
  };
}

export function getTimelineWidth(scale: TimelineScale): number {
  return Math.max(900, (scale.endMinute - scale.startMinute) * scale.pixelsPerMinute);
}

export function getHourTicks(scale: TimelineScale): number[] {
  const ticks: number[] = [];
  for (let minute = scale.startMinute; minute < scale.endMinute; minute += 60) {
    ticks.push(minute);
  }
  return ticks;
}

export function getLeftForEntry(entry: TimelineEntry, scale: TimelineScale): number {
  const minute = getEntryStartMinute(entry);
  return Math.max(0, (minute - scale.startMinute) * scale.pixelsPerMinute);
}

export function getPositionedEntries(
  entries: TimelineEntry[],
  scale: TimelineScale,
): PositionedEntry[] {
  const rowsEnd: number[] = [];
  const minVisualGapMinutes = MIN_VISUAL_GAP_PX / scale.pixelsPerMinute;

  return [...entries]
    .sort((a, b) => {
      const startDelta =
        getEntryStartMinute(a) - getEntryStartMinute(b);
      return startDelta || a.title.localeCompare(b.title);
    })
    .map((entry) => {
      const startMinute = getEntryStartMinute(entry);
      const endMinute = getEntryEndMinute(entry);
      const row = rowsEnd.findIndex((rowEndMinute) => rowEndMinute <= startMinute);
      const assignedRow = row === -1 ? rowsEnd.length : row;

      rowsEnd[assignedRow] = Math.max(endMinute, startMinute + minVisualGapMinutes);

      return {
        entry,
        startMinute,
        endMinute,
        left: Math.max(0, (startMinute - scale.startMinute) * scale.pixelsPerMinute),
        width: Math.max(MIN_ENTRY_WIDTH, (endMinute - startMinute) * scale.pixelsPerMinute),
        row: assignedRow,
      };
    });
}

export function getTimelineRowCount(positionedEntries: PositionedEntry[]): number {
  if (positionedEntries.length === 0) {
    return 1;
  }

  return Math.max(...positionedEntries.map((entry) => entry.row)) + 1;
}
