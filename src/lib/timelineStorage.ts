import { seedTimeline } from "../data/seedTimeline";
import { normaliseEntryDate } from "./timeScale";
import {
  entryStatuses,
  entryTypes,
  timelineRoles,
  type EntryStatus,
  type TimelineEntry,
  type TimelineRole,
} from "../types/timeline";

const STORAGE_KEY = "wedding-day-planner.timeline.v1";
const KNOWN_MAIN_ENTRY_IDS = new Set([
  "prep-hair-makeup",
  "guests-arrive",
  "ceremony",
  "confetti-line",
  "couple-portraits",
  "drinks-reception",
  "dinner-call",
  "speeches",
  "cake-cutting",
  "first-dance",
  "evening-party",
]);
const KNOWN_PARENT_ENTRY_IDS = new Map([
  ["flowers-collection", "ceremony"],
  ["cake-collection", "cake-cutting"],
  ["photographer-arrives", "prep-hair-makeup"],
  ["prep-dresses-ready", "prep-hair-makeup"],
  ["rings-to-sam", "ceremony"],
  ["ceremony-flowers-set", "ceremony"],
  ["cake-delivery", "cake-cutting"],
  ["seating-plan-set", "dinner-call"],
  ["cake-setup", "cake-cutting"],
  ["cake-boxed", "cake-cutting"],
  ["decor-collection", "evening-party"],
]);

function cloneSeedTimeline(): TimelineEntry[] {
  return seedTimeline.map((entry) => ({ ...entry, people: [...entry.people], items: [...entry.items], relatedEntryIds: [...entry.relatedEntryIds] }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normaliseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normaliseStatus(value: unknown): EntryStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return entryStatuses.includes(value as EntryStatus) ? (value as EntryStatus) : undefined;
}

function normaliseTimelineRole(value: unknown, entryId: string, entryType: TimelineEntry["type"]): TimelineRole {
  if (KNOWN_MAIN_ENTRY_IDS.has(entryId)) {
    return "main";
  }

  if (KNOWN_PARENT_ENTRY_IDS.has(entryId)) {
    return "sub";
  }

  if (typeof value === "string" && timelineRoles.includes(value as TimelineRole)) {
    return value as TimelineRole;
  }

  return entryType === "event" ? "main" : "sub";
}

function normaliseEntry(value: unknown): TimelineEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.startTime !== "string" ||
    !entryTypes.includes(value.type as TimelineEntry["type"])
  ) {
    return null;
  }

  const type = value.type as TimelineEntry["type"];
  const id = value.id;

  return {
    id: value.id,
    title: value.title,
    type,
    date: normaliseEntryDate(typeof value.date === "string" ? value.date : undefined),
    startTime: value.startTime,
    endTime: typeof value.endTime === "string" ? value.endTime : undefined,
    durationMinutes:
      typeof value.durationMinutes === "number" && Number.isFinite(value.durationMinutes)
        ? value.durationMinutes
        : undefined,
    location: typeof value.location === "string" ? value.location : undefined,
    description: typeof value.description === "string" ? value.description : undefined,
    people: normaliseStringArray(value.people),
    items: normaliseStringArray(value.items),
    relatedEntryIds: normaliseStringArray(value.relatedEntryIds),
    timelineRole: normaliseTimelineRole(value.timelineRole, id, type),
    parentEntryId:
      typeof value.parentEntryId === "string"
        ? value.parentEntryId
        : KNOWN_PARENT_ENTRY_IDS.get(id),
    status: normaliseStatus(value.status),
    color: typeof value.color === "string" ? value.color : undefined,
  };
}

export function loadTimelineEntries(): TimelineEntry[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return cloneSeedTimeline();
    }

    const parsed = JSON.parse(stored) as unknown;

    if (!Array.isArray(parsed)) {
      return cloneSeedTimeline();
    }

    const entries = parsed.map(normaliseEntry).filter((entry): entry is TimelineEntry => entry !== null);
    return entries.length > 0 ? entries : cloneSeedTimeline();
  } catch {
    return cloneSeedTimeline();
  }
}

export function saveTimelineEntries(entries: TimelineEntry[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function resetTimelineEntries(): TimelineEntry[] {
  const entries = cloneSeedTimeline();
  saveTimelineEntries(entries);
  return entries;
}

export function parseImportedTimeline(json: string): TimelineEntry[] | null {
  try {
    const parsed = JSON.parse(json) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    const entries = parsed.map(normaliseEntry).filter((entry): entry is TimelineEntry => entry !== null);
    return entries.length > 0 ? entries : null;
  } catch {
    return null;
  }
}
