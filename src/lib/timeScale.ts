import type { PositionedEntry, TimelineEntry, TimelineScale } from "../types/timeline";

const DEFAULT_START_MINUTE = 8 * 60;
const DEFAULT_END_MINUTE = 24 * 60;
const DEFAULT_DURATION_MINUTES = 15;
const DEFAULT_PIXELS_PER_MINUTE = 2.8;
const MIN_ENTRY_WIDTH = 42;

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
  const dayMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(dayMinutes / 60);
  const mins = dayMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function getEntryDurationMinutes(entry: TimelineEntry): number {
  const start = parseTimeToMinutes(entry.startTime);
  const end = parseTimeToMinutes(entry.endTime);

  if (start !== null && end !== null && end > start) {
    return end - start;
  }

  if (entry.durationMinutes && entry.durationMinutes > 0) {
    return entry.durationMinutes;
  }

  return DEFAULT_DURATION_MINUTES;
}

export function getEntryEndMinute(entry: TimelineEntry): number {
  const start = parseTimeToMinutes(entry.startTime) ?? DEFAULT_START_MINUTE;
  return start + getEntryDurationMinutes(entry);
}

export function createTimelineScale(entries: TimelineEntry[]): TimelineScale {
  const validStarts = entries
    .map((entry) => parseTimeToMinutes(entry.startTime))
    .filter((minute): minute is number => minute !== null);
  const validEnds = entries.map(getEntryEndMinute);

  const firstStart = validStarts.length > 0 ? Math.min(...validStarts) : DEFAULT_START_MINUTE;
  const lastEnd = validEnds.length > 0 ? Math.max(...validEnds) : DEFAULT_END_MINUTE;

  const paddedStart = Math.min(DEFAULT_START_MINUTE, firstStart - 30);
  const paddedEnd = Math.max(DEFAULT_END_MINUTE, lastEnd + 45);

  return {
    startMinute: Math.max(0, Math.floor(paddedStart / 60) * 60),
    endMinute: Math.min(24 * 60, Math.ceil(paddedEnd / 60) * 60),
    pixelsPerMinute: DEFAULT_PIXELS_PER_MINUTE,
  };
}

export function getTimelineWidth(scale: TimelineScale): number {
  return Math.max(900, (scale.endMinute - scale.startMinute) * scale.pixelsPerMinute);
}

export function getHourTicks(scale: TimelineScale): number[] {
  const ticks: number[] = [];
  for (let minute = scale.startMinute; minute <= scale.endMinute; minute += 60) {
    ticks.push(minute);
  }
  return ticks;
}

export function getLeftForTime(time: string, scale: TimelineScale): number {
  const minute = parseTimeToMinutes(time) ?? scale.startMinute;
  return Math.max(0, (minute - scale.startMinute) * scale.pixelsPerMinute);
}

export function getPositionedEntries(
  entries: TimelineEntry[],
  scale: TimelineScale,
): PositionedEntry[] {
  const rowsEnd: number[] = [];

  return [...entries]
    .sort((a, b) => {
      const startDelta =
        (parseTimeToMinutes(a.startTime) ?? 0) - (parseTimeToMinutes(b.startTime) ?? 0);
      return startDelta || a.title.localeCompare(b.title);
    })
    .map((entry) => {
      const startMinute = parseTimeToMinutes(entry.startTime) ?? scale.startMinute;
      const endMinute = getEntryEndMinute(entry);
      const row = rowsEnd.findIndex((rowEndMinute) => rowEndMinute <= startMinute);
      const assignedRow = row === -1 ? rowsEnd.length : row;

      rowsEnd[assignedRow] = endMinute;

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
