import type { CSSProperties } from "react";
import type { PositionedEntry, TimelineEntry } from "../types/timeline";
import { formatEntryDateTime } from "../lib/timeScale";

type TimelineEntryCardProps = {
  centerY: number;
  isGhost?: boolean;
  isSelected: boolean;
  labelEmphasis: number;
  positionedEntry: PositionedEntry;
  showLabel: boolean;
  timelineWidth: number;
  onEntryOpen: (entry: TimelineEntry) => void;
  onEntryHoverEnd: () => void;
  onEntryHoverStart: (entryId: string) => void;
};

type EntryStyle = CSSProperties & {
  "--label-emphasis": string;
};

export function TimelineEntryCard({
  centerY,
  isGhost = false,
  isSelected,
  labelEmphasis,
  positionedEntry,
  showLabel,
  timelineWidth,
  onEntryOpen,
  onEntryHoverEnd,
  onEntryHoverStart,
}: TimelineEntryCardProps): JSX.Element {
  const { entry } = positionedEntry;
  const tags = [...entry.people, ...entry.items];
  const visibleTags = tags.slice(0, 4);
  const hiddenTagCount = tags.length - visibleTags.length;
  const style: EntryStyle = {
    "--label-emphasis": String(labelEmphasis),
    left: `${positionedEntry.left}px`,
    top: `${centerY}px`,
  };
  const edgeClass =
    positionedEntry.left < 220
      ? "timeline-entry--edge-start"
      : positionedEntry.left > timelineWidth - 220
        ? "timeline-entry--edge-end"
        : "";
  const ariaLabel = [
    entry.title,
    formatEntryDateTime(entry),
    entry.location,
    entry.people.length ? `People: ${entry.people.join(", ")}` : "",
    entry.items.length ? `Items: ${entry.items.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div
      className={`timeline-entry ${edgeClass} ${isGhost ? "timeline-entry--ghost" : ""} ${isSelected ? "timeline-entry--selected" : ""} ${showLabel ? "" : "timeline-entry--label-hidden"}`}
      style={style}
    >
      <button
        className="timeline-dot"
        type="button"
        aria-label={ariaLabel}
        title={entry.title}
        onClick={() => onEntryOpen(entry)}
        onMouseEnter={() => onEntryHoverStart(entry.id)}
        onMouseLeave={onEntryHoverEnd}
        onPointerEnter={() => onEntryHoverStart(entry.id)}
        onPointerLeave={onEntryHoverEnd}
      >
      </button>
      <span className="timeline-entry__label">{entry.title}</span>
      {tags.length > 0 ? (
        <div className="timeline-entry__tags" aria-hidden="true">
          {visibleTags.map((tag) => (
            <span className="timeline-entry__tag" key={`${entry.id}-${tag}`}>
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 ? (
            <span className="timeline-entry__tag timeline-entry__tag--more">
              +{hiddenTagCount}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
