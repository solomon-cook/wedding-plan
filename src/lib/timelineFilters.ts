import type { Focus, SearchResult, TimelineEntry } from "../types/timeline";
import { formatEntryDateTime, getEntryStartMinute } from "./timeScale";

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function includesQuery(value: string | undefined, query: string): boolean {
  return normalise(value ?? "").includes(query);
}

export function sortEntriesByStart(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => {
    const startDelta = getEntryStartMinute(a) - getEntryStartMinute(b);
    return startDelta || a.title.localeCompare(b.title);
  });
}

export function isMainTimelineEntry(entry: TimelineEntry): boolean {
  return entry.timelineRole === "main";
}

export function isSubTimelineEntry(entry: TimelineEntry): boolean {
  return entry.timelineRole === "sub";
}

export function getMainTimelineEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return sortEntriesByStart(entries.filter(isMainTimelineEntry));
}

export function entryMatchesQuery(entry: TimelineEntry, rawQuery: string): boolean {
  const query = normalise(rawQuery);

  if (!query) {
    return true;
  }

  return (
    includesQuery(entry.title, query) ||
    includesQuery(entry.type, query) ||
    includesQuery(entry.location, query) ||
    includesQuery(entry.description, query) ||
    entry.people.some((person) => includesQuery(person, query)) ||
    entry.items.some((item) => includesQuery(item, query))
  );
}

export function getFocusedEntries(entries: TimelineEntry[], focus: Focus): TimelineEntry[] {
  switch (focus.kind) {
    case "all":
      return sortEntriesByStart(entries);
    case "person":
      return sortEntriesByStart(entries.filter((entry) => entry.people.includes(focus.value)));
    case "item":
      return sortEntriesByStart(entries.filter((entry) => entry.items.includes(focus.value)));
    case "entry": {
      const selectedEntry = entries.find((entry) => entry.id === focus.entryId);
      if (!selectedEntry) {
        return [];
      }

      if (isMainTimelineEntry(selectedEntry)) {
        const relatedIds = new Set([
          ...selectedEntry.relatedEntryIds,
          ...entries
            .filter((entry) => entry.relatedEntryIds.includes(selectedEntry.id))
            .map((entry) => entry.id),
        ]);

        return sortEntriesByStart(
          entries.filter(
            (entry) =>
              isSubTimelineEntry(entry) &&
              (entry.parentEntryId === selectedEntry.id || relatedIds.has(entry.id)),
          ),
        );
      }

      const parentAndSiblingIds = new Set([
        selectedEntry.id,
        ...selectedEntry.relatedEntryIds,
        ...entries
          .filter((entry) => entry.relatedEntryIds.includes(selectedEntry.id))
          .map((entry) => entry.id),
      ]);

      if (selectedEntry.parentEntryId) {
        entries
          .filter((entry) => entry.parentEntryId === selectedEntry.parentEntryId)
          .forEach((entry) => parentAndSiblingIds.add(entry.id));
      }

      return sortEntriesByStart(entries.filter((entry) => parentAndSiblingIds.has(entry.id)));
    }
    case "search":
      return sortEntriesByStart(entries.filter((entry) => entryMatchesQuery(entry, focus.query)));
  }
}

export function getGhostEntries(entries: TimelineEntry[], focus: Focus): TimelineEntry[] {
  if (focus.kind !== "person" && focus.kind !== "item" && focus.kind !== "search") {
    return [];
  }

  return getFocusedEntries(entries, focus).filter(isSubTimelineEntry);
}

export function getUniquePeople(entries: TimelineEntry[]): string[] {
  return [...new Set(entries.flatMap((entry) => entry.people))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function getUniqueItems(entries: TimelineEntry[]): string[] {
  return [...new Set(entries.flatMap((entry) => entry.items))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function getSearchResults(entries: TimelineEntry[], rawQuery: string): SearchResult[] {
  const query = normalise(rawQuery);

  if (!query) {
    return [];
  }

  const peopleResults: SearchResult[] = getUniquePeople(entries)
    .filter((person) => includesQuery(person, query))
    .slice(0, 5)
    .map((person) => ({ kind: "person", label: person }));

  const itemResults: SearchResult[] = getUniqueItems(entries)
    .filter((item) => includesQuery(item, query))
    .slice(0, 5)
    .map((item) => ({ kind: "item", label: item }));

  const entryResults: SearchResult[] = sortEntriesByStart(
    entries.filter((entry) => entryMatchesQuery(entry, query)),
  )
    .slice(0, 8)
    .map((entry) => ({
      kind: "entry",
      label: entry.title,
      entryId: entry.id,
      meta: [formatEntryDateTime(entry), entry.location].filter(Boolean).join(" · "),
    }));

  return [...peopleResults, ...itemResults, ...entryResults];
}

export function getFocusLabel(entries: TimelineEntry[], focus: Focus): string {
  switch (focus.kind) {
    case "all":
      return "Everything";
    case "person":
      return focus.value;
    case "item":
      return focus.value;
    case "search":
      return `Search: ${focus.query}`;
    case "entry": {
      const entry = entries.find((candidate) => candidate.id === focus.entryId);
      return entry ? entry.title : "Selected entry";
    }
  }
}
