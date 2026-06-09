import { seedTimeline } from "../data/seedTimeline";
import { normaliseEntryDate } from "./timeScale";
import {
  entryStatuses,
  entryTypes,
  timelineRoles,
  type EntryStatus,
  type PersonItemAssociations,
  type TimelineEntry,
  type TimelineRole,
} from "../types/timeline";

const STORAGE_KEY = "wedding-day-planner.timeline.v3";
const ASSOCIATIONS_STORAGE_KEY = "wedding-day-planner.associations.v3";
const KNOWN_MAIN_ENTRY_IDS = new Set([
  "thursday-wedding-preparations",
  "the-well-set-up",
  "the-hide-set-up",
  "friday-meal-family-helpers",
  "bridal-party-getting-ready",
  "bring-items-guest-road-to-church",
  "bring-items-everton-road-to-church",
  "bring-items-dorothy-road-to-church",
  "sol-and-groomsmen-arrive-church",
  "ceremony-arrival",
  "church-ceremony",
  "confetti-photo",
  "family-and-friends-photos",
  "food-in-cafe",
  "surprise-view-photos",
  "guests-arrival-wedding-breakfast",
  "wedding-breakfast",
  "bride-and-groom-arrive-hide",
  "speeches",
  "evening-reception-guests-arrive",
  "wedding-cake-cutting",
  "first-dance",
  "evening-reception",
  "clear-up-and-collecting-things",
]);
const KNOWN_PARENT_ENTRY_IDS = new Map([
  ["band-arrive-the-well", "church-ceremony"],
  ["groomsmen-snacks-refreshments-confetti", "church-ceremony"],
  ["groomsmen-clear-up-the-well", "food-in-cafe"],
  ["dj-arrives", "evening-reception"],
]);

function cloneSeedTimeline(): TimelineEntry[] {
  return seedTimeline.map((entry) => ({ ...entry, people: [...entry.people], items: [...entry.items], relatedEntryIds: [...entry.relatedEntryIds] }));
}

function mergeMissingSeedEntries(entries: TimelineEntry[]): TimelineEntry[] {
  const entryIds = new Set(entries.map((entry) => entry.id));
  const missingSeedEntries = cloneSeedTimeline().filter((entry) => !entryIds.has(entry.id));

  return missingSeedEntries.length > 0 ? [...entries, ...missingSeedEntries] : entries;
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

function sortStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function createAssociationsFromEntries(entries: TimelineEntry[]): PersonItemAssociations {
  const eventItemPeople: Record<string, Record<string, string[]>> = {};

  entries.forEach((entry) => {
    eventItemPeople[entry.id] = {};

    entry.items.forEach((item) => {
      eventItemPeople[entry.id][item] = sortStrings(entry.people);
    });
  });

  return { eventItemPeople };
}

function normaliseAssociations(value: unknown): PersonItemAssociations | null {
  if (!isRecord(value) || !isRecord(value.eventItemPeople)) {
    return null;
  }

  const eventItemPeople: Record<string, Record<string, string[]>> = {};

  Object.entries(value.eventItemPeople).forEach(([entryId, itemsToPeople]) => {
    if (!entryId.trim() || !isRecord(itemsToPeople)) {
      return;
    }

    eventItemPeople[entryId.trim()] = {};

    Object.entries(itemsToPeople).forEach(([item, people]) => {
      if (item.trim()) {
        eventItemPeople[entryId.trim()][item.trim()] = sortStrings(normaliseStringArray(people));
      }
    });
  });

  return { eventItemPeople };
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
    return entries.length > 0 ? mergeMissingSeedEntries(entries) : cloneSeedTimeline();
  } catch {
    return cloneSeedTimeline();
  }
}

export function saveTimelineEntries(entries: TimelineEntry[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function loadAssociations(entries: TimelineEntry[]): PersonItemAssociations {
  try {
    const stored = window.localStorage.getItem(ASSOCIATIONS_STORAGE_KEY);

    if (!stored) {
      return createAssociationsFromEntries(entries);
    }

    const associations = normaliseAssociations(JSON.parse(stored) as unknown);
    return associations ?? createAssociationsFromEntries(entries);
  } catch {
    return createAssociationsFromEntries(entries);
  }
}

export function saveAssociations(associations: PersonItemAssociations): void {
  window.localStorage.setItem(ASSOCIATIONS_STORAGE_KEY, JSON.stringify(associations));
}

export function resetTimelineEntries(): TimelineEntry[] {
  const entries = cloneSeedTimeline();
  saveTimelineEntries(entries);
  saveAssociations(createAssociationsFromEntries(entries));
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
