import { useMemo, useState, type KeyboardEvent } from "react";
import { Edit3 } from "lucide-react";
import { formatEntryDate } from "../lib/timeScale";
import type { PersonItemAssociations, TimelineEntry } from "../types/timeline";

type JobsBoardProps = {
  associations: PersonItemAssociations;
  entries: TimelineEntry[];
  onAssociationsUpdate: (associations: PersonItemAssociations) => void;
  onEntryEdit: (entry: TimelineEntry) => void;
  onEntryUpdate: (entry: TimelineEntry) => void;
  onEntriesUpdate: (entries: TimelineEntry[]) => void;
};

type JobsView = "events" | "items" | "people";

type ItemResponsibility = {
  item: string;
  people: string[];
  locations: string[];
  entries: TimelineEntry[];
};

type PersonResponsibility = {
  person: string;
  entries: TimelineEntry[];
  items: string[];
};

function joinList(values: string[]): string {
  return values.join(", ");
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function compareEntries(first: TimelineEntry, second: TimelineEntry): number {
  const firstDate = first.date ?? "";
  const secondDate = second.date ?? "";

  if (firstDate !== secondDate) {
    return firstDate.localeCompare(secondDate);
  }

  if (first.startTime !== second.startTime) {
    return first.startTime.localeCompare(second.startTime);
  }

  return first.title.localeCompare(second.title);
}

function sortStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normaliseLabel(value: string): string {
  return value.trim().toLowerCase();
}

function handleCommitKey(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === "Enter") {
    event.currentTarget.blur();
  }
}

function getResponsiblePeopleForEntryItem(
  associations: PersonItemAssociations,
  entry: TimelineEntry,
  item: string,
): string[] {
  const responsiblePeople = associations.eventItemPeople[entry.id]?.[item] ?? [];
  return responsiblePeople.length > 0 ? sortStrings(responsiblePeople) : sortStrings(entry.people);
}

function getItemResponsibilities(
  entries: TimelineEntry[],
  associations: PersonItemAssociations,
): ItemResponsibility[] {
  const responsibilities = new Map<string, ItemResponsibility>();

  entries.forEach((entry) => {
    entry.items.forEach((item) => {
      const existing = responsibilities.get(item) ?? {
        item,
        people: [],
        locations: [],
        entries: [],
      };

      existing.people = sortStrings([
        ...existing.people,
        ...getResponsiblePeopleForEntryItem(associations, entry, item),
      ]);
      existing.locations = sortStrings([
        ...existing.locations,
        entry.location ?? "Location not set",
      ]);
      existing.entries = [...existing.entries, entry].sort(compareEntries);

      responsibilities.set(item, existing);
    });
  });

  return [...responsibilities.values()].sort((a, b) => a.item.localeCompare(b.item));
}

function getPersonResponsibilities(
  entries: TimelineEntry[],
  associations: PersonItemAssociations,
): PersonResponsibility[] {
  const responsibilities = new Map<string, PersonResponsibility>();
  const entryTitles = new Set(entries.map((entry) => normaliseLabel(entry.title)));

  entries.forEach((entry) => {
    const people = new Set(entry.people);
    Object.values(associations.eventItemPeople[entry.id] ?? {}).forEach((itemPeople) => {
      itemPeople.forEach((person) => people.add(person));
    });

    people.forEach((person) => {
      const itemsForPerson = entry.items.filter(
        (item) =>
          !entryTitles.has(normaliseLabel(item)) &&
          getResponsiblePeopleForEntryItem(associations, entry, item).includes(person),
      );
      const existing = responsibilities.get(person) ?? {
        person,
        entries: [],
        items: [],
      };

      existing.entries = [...existing.entries, entry].sort(compareEntries);
      existing.items = sortStrings([...existing.items, ...itemsForPerson]);

      responsibilities.set(person, existing);
    });
  });

  return [...responsibilities.values()].sort((a, b) => a.person.localeCompare(b.person));
}

export function JobsBoard({
  associations,
  entries,
  onAssociationsUpdate,
  onEntryEdit,
  onEntryUpdate,
  onEntriesUpdate,
}: JobsBoardProps): JSX.Element {
  const [view, setView] = useState<JobsView>("events");
  const sortedEntries = useMemo(() => [...entries].sort(compareEntries), [entries]);
  const itemResponsibilities = useMemo(
    () => getItemResponsibilities(entries, associations),
    [associations, entries],
  );
  const personResponsibilities = useMemo(
    () => getPersonResponsibilities(entries, associations),
    [associations, entries],
  );

  function renameItem(currentItem: string, nextValue: string): void {
    const nextItem = nextValue.trim();

    if (!nextItem || nextItem === currentItem) {
      return;
    }

    onEntriesUpdate(
      entries.map((entry) => ({
        ...entry,
        items: sortStrings(entry.items.map((item) => (item === currentItem ? nextItem : item))),
      })),
    );

    onAssociationsUpdate({
      eventItemPeople: Object.fromEntries(
        Object.entries(associations.eventItemPeople).map(([entryId, itemPeople]) => {
          const nextItemPeople: Record<string, string[]> = {};

          Object.entries(itemPeople).forEach(([item, people]) => {
            const itemName = item === currentItem ? nextItem : item;
            nextItemPeople[itemName] = sortStrings([...(nextItemPeople[itemName] ?? []), ...people]);
          });

          return [entryId, nextItemPeople];
        }),
      ),
    });
  }

  function updateItemPeople(item: string, nextValue: string): void {
    const nextPeople = sortStrings(splitList(nextValue));

    onAssociationsUpdate({
      eventItemPeople: Object.fromEntries(
        Object.entries(associations.eventItemPeople).map(([entryId, itemPeople]) => {
          const entry = entries.find((candidate) => candidate.id === entryId);

          if (!entry?.items.includes(item)) {
            return [entryId, itemPeople];
          }

          return [
            entryId,
            {
              ...itemPeople,
              [item]: nextPeople,
            },
          ];
        }),
      ),
    });
  }

  function renamePerson(currentPerson: string, nextValue: string): void {
    const nextPerson = nextValue.trim();

    if (!nextPerson || nextPerson === currentPerson) {
      return;
    }

    onEntriesUpdate(
      entries.map((entry) => ({
        ...entry,
        people: sortStrings(
          entry.people.map((person) => (person === currentPerson ? nextPerson : person)),
        ),
      })),
    );

    onAssociationsUpdate({
      eventItemPeople: Object.fromEntries(
        Object.entries(associations.eventItemPeople).map(([entryId, itemPeople]) => [
          entryId,
          Object.fromEntries(
            Object.entries(itemPeople).map(([item, people]) => [
              item,
              sortStrings(
                people.map((person) => (person === currentPerson ? nextPerson : person)),
              ),
            ]),
          ),
        ]),
      ),
    });
  }

  return (
    <main className="jobs-workspace">
      <section className="jobs-board" aria-label="Jobs and events assignments">
        <div className="jobs-board__header">
          <div>
            <span className="section-label">Assignments</span>
            <h1>
              {view === "events"
                ? "Jobs and events"
                : view === "items"
                  ? "Required items"
                  : "People with jobs"}
            </h1>
          </div>
          <div className="jobs-board__tabs" aria-label="Assignment view">
            <button
              className={`quiet-button ${view === "events" ? "quiet-button--active" : ""}`}
              type="button"
              onClick={() => setView("events")}
            >
              Jobs
            </button>
            <button
              className={`quiet-button ${view === "items" ? "quiet-button--active" : ""}`}
              type="button"
              onClick={() => setView("items")}
            >
              Items
            </button>
            <button
              className={`quiet-button ${view === "people" ? "quiet-button--active" : ""}`}
              type="button"
              onClick={() => setView("people")}
            >
              People
            </button>
          </div>
        </div>

        {view === "events" ? (
          <div className="jobs-table" role="table" aria-label="Jobs and events">
          <div className="jobs-table__head" role="row">
            <span role="columnheader">Job or event</span>
            <span role="columnheader">Time</span>
            <span role="columnheader">Place</span>
            <span role="columnheader">Person</span>
            <span role="columnheader">Required items</span>
            <span role="columnheader">Edit</span>
          </div>

          <div className="jobs-table__body">
            {sortedEntries.map((entry) => (
              <div className="jobs-row" role="row" key={entry.id}>
                <div className="jobs-row__title" role="cell">
                  <strong>{entry.title}</strong>
                  <span>
                    {formatEntryDate(entry)} · {entry.type}
                    {entry.status ? ` · ${entry.status}` : ""}
                  </span>
                </div>

                <label className="jobs-field" role="cell">
                  <span>Time</span>
                  <input
                    aria-label={`${entry.title} time`}
                    type="time"
                    value={entry.startTime}
                    onChange={(event) =>
                      onEntryUpdate({ ...entry, startTime: event.currentTarget.value })
                    }
                  />
                </label>

                <label className="jobs-field" role="cell">
                  <span>Place</span>
                  <input
                    aria-label={`${entry.title} place`}
                    type="text"
                    value={entry.location ?? ""}
                    onChange={(event) =>
                      onEntryUpdate({
                        ...entry,
                        location: event.currentTarget.value.trim() || undefined,
                      })
                    }
                  />
                </label>

                <label className="jobs-field" role="cell">
                  <span>Person</span>
                  <input
                    aria-label={`${entry.title} person`}
                    type="text"
                    value={joinList(entry.people)}
                    onChange={(event) =>
                      onEntryUpdate({ ...entry, people: splitList(event.currentTarget.value) })
                    }
                  />
                </label>

                <label className="jobs-field" role="cell">
                  <span>Required items</span>
                  <input
                    aria-label={`${entry.title} required items`}
                    type="text"
                    value={joinList(entry.items)}
                    onChange={(event) =>
                      onEntryUpdate({ ...entry, items: splitList(event.currentTarget.value) })
                    }
                  />
                </label>

                <div className="jobs-row__actions" role="cell">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Edit ${entry.title}`}
                    title="Edit full entry"
                    onClick={() => onEntryEdit(entry)}
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        ) : null}

        {view === "items" ? (
          <div className="summary-list" aria-label="Required items">
            {itemResponsibilities.map((responsibility) => (
              <article className="summary-row" key={responsibility.item}>
                <div className="summary-row__primary">
                  <label className="summary-field">
                    <span>Item</span>
                    <input
                      aria-label={`Rename item ${responsibility.item}`}
                      defaultValue={responsibility.item}
                      type="text"
                      onBlur={(event) => renameItem(responsibility.item, event.currentTarget.value)}
                      onKeyDown={handleCommitKey}
                    />
                  </label>
                  <label className="summary-field">
                    <span>People</span>
                    <input
                      aria-label={`People responsible for ${responsibility.item}`}
                      defaultValue={
                        responsibility.people.length > 0 ? joinList(responsibility.people) : ""
                      }
                      placeholder="No person assigned"
                      type="text"
                      onBlur={(event) =>
                        updateItemPeople(responsibility.item, event.currentTarget.value)
                      }
                      onKeyDown={handleCommitKey}
                    />
                  </label>
                </div>
                <div className="summary-row__meta">
                  <span>Before wedding: {joinList(responsibility.locations)}</span>
                  <span>
                    Needed for:{" "}
                    {responsibility.entries
                      .map((entry) => `${entry.title} (${formatEntryDate(entry)})`)
                      .join(", ")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {view === "people" ? (
          <div className="summary-list" aria-label="People with jobs">
            {personResponsibilities.map((responsibility) => (
              <article className="summary-row" key={responsibility.person}>
                <div className="summary-row__primary">
                  <label className="summary-field">
                    <span>Person</span>
                    <input
                      aria-label={`Rename person ${responsibility.person}`}
                      defaultValue={responsibility.person}
                      type="text"
                      onBlur={(event) =>
                        renamePerson(responsibility.person, event.currentTarget.value)
                      }
                      onKeyDown={handleCommitKey}
                    />
                  </label>
                  <span>
                    {responsibility.entries.length}{" "}
                    {responsibility.entries.length === 1 ? "job or event" : "jobs and events"}
                  </span>
                </div>
                <div className="summary-row__meta">
                  <span>Tasks: {responsibility.entries.map((entry) => entry.title).join(", ")}</span>
                  <span>
                    Items:{" "}
                    {responsibility.items.length > 0
                      ? joinList(responsibility.items)
                      : "No items assigned"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
