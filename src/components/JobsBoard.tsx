import { Edit3 } from "lucide-react";
import { formatEntryDate } from "../lib/timeScale";
import type { TimelineEntry } from "../types/timeline";

type JobsBoardProps = {
  entries: TimelineEntry[];
  onEntryEdit: (entry: TimelineEntry) => void;
  onEntryUpdate: (entry: TimelineEntry) => void;
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

export function JobsBoard({
  entries,
  onEntryEdit,
  onEntryUpdate,
}: JobsBoardProps): JSX.Element {
  const sortedEntries = [...entries].sort(compareEntries);

  return (
    <main className="jobs-workspace">
      <section className="jobs-board" aria-label="Jobs and events assignments">
        <div className="jobs-board__header">
          <div>
            <span className="section-label">Assignments</span>
            <h1>Jobs and events</h1>
          </div>
        </div>

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
      </section>
    </main>
  );
}
