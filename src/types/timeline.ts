export const entryTypes = [
  "event",
  "task",
  "item",
  "person",
  "location",
  "note",
] as const;

export const entryStatuses = [
  "todo",
  "in-progress",
  "done",
  "blocked",
] as const;

export const timelineRoles = ["main", "sub"] as const;

export type EntryType = (typeof entryTypes)[number];
export type EntryStatus = (typeof entryStatuses)[number];
export type TimelineRole = (typeof timelineRoles)[number];

export type TimelineEntry = {
  id: string;
  title: string;
  type: EntryType;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  location?: string;
  description?: string;
  people: string[];
  items: string[];
  relatedEntryIds: string[];
  timelineRole?: TimelineRole;
  parentEntryId?: string;
  status?: EntryStatus;
  color?: string;
};

export type Focus =
  | { kind: "all" }
  | { kind: "person"; value: string }
  | { kind: "item"; value: string }
  | { kind: "entry"; entryId: string }
  | { kind: "search"; query: string };

export type SearchResult =
  | { kind: "person"; label: string }
  | { kind: "item"; label: string }
  | { kind: "entry"; label: string; entryId: string; meta: string };

export type TimelineScale = {
  startMinute: number;
  endMinute: number;
  pixelsPerMinute: number;
};

export type PositionedEntry = {
  entry: TimelineEntry;
  startMinute: number;
  endMinute: number;
  left: number;
  width: number;
  row: number;
};
