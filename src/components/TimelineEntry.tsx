import type { CSSProperties } from "react";
import type { PositionedEntry, TimelineEntry } from "../types/timeline";

type TimelineEntryCardProps = {
  centerY: number;
  isGhost?: boolean;
  isSelected: boolean;
  labelEmphasis: number;
  positionedEntry: PositionedEntry;
  timelineWidth: number;
  onEntryOpen: (entry: TimelineEntry) => void;
};

type EntryStyle = CSSProperties & {
  "--entry-color": string;
  "--label-emphasis": string;
};

function getLaneOffset(row: number): number {
  if (row === 0) {
    return 0;
  }

  const distance = Math.ceil(row / 2) * 40;
  return row % 2 === 1 ? -distance : distance;
}

export function TimelineEntryCard({
  centerY,
  isGhost = false,
  isSelected,
  labelEmphasis,
  positionedEntry,
  timelineWidth,
  onEntryOpen,
}: TimelineEntryCardProps): JSX.Element {
  const { entry } = positionedEntry;
  const laneOffset = getLaneOffset(positionedEntry.row);
  const top = centerY + laneOffset;
  const guideStyle: CSSProperties = {
    top: `${Math.min(0, -laneOffset)}px`,
    height: `${Math.abs(laneOffset)}px`,
  };
  const style: EntryStyle = {
    "--entry-color": entry.color ?? "#6f8fa3",
    "--label-emphasis": String(labelEmphasis),
    left: `${positionedEntry.left}px`,
    top: `${top}px`,
  };
  const placementClass = laneOffset > 0 ? "timeline-entry--below" : "timeline-entry--above";
  const edgeClass =
    positionedEntry.left < 220
      ? "timeline-entry--edge-start"
      : positionedEntry.left > timelineWidth - 220
        ? "timeline-entry--edge-end"
        : "";
  const ariaLabel = [
    entry.title,
    entry.startTime,
    entry.location,
    entry.people.length ? `People: ${entry.people.join(", ")}` : "",
    entry.items.length ? `Items: ${entry.items.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div
      className={`timeline-entry ${placementClass} ${edgeClass} ${isGhost ? "timeline-entry--ghost" : ""} ${isSelected ? "timeline-entry--selected" : ""}`}
      style={style}
    >
      {laneOffset !== 0 ? <span className="timeline-entry__guide" style={guideStyle} /> : null}
      <button
        className="timeline-dot"
        type="button"
        aria-label={ariaLabel}
        title={entry.title}
        onClick={() => onEntryOpen(entry)}
      >
      </button>
      <span className="timeline-entry__label">{entry.title}</span>
      <div className="timeline-entry__tooltip" role="tooltip">
        <strong>{entry.title}</strong>
        <span>
          {entry.startTime}
          {entry.location ? ` · ${entry.location}` : ""}
        </span>
      </div>
    </div>
  );
}
