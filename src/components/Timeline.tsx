import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  formatMinutesAsTime,
  getHourTicks,
  getPositionedEntries,
  getTimelineRowCount,
  getTimelineWidth,
} from "../lib/timeScale";
import type { TimelineEntry, TimelineScale } from "../types/timeline";
import { TimelineEntryCard } from "./TimelineEntry";

type TimelineProps = {
  entries: TimelineEntry[];
  emptyMessage: string;
  ghostEntries?: TimelineEntry[];
  scale: TimelineScale;
  scrollLeft: number;
  selectedEntryId: string | null;
  selectedEntry: TimelineEntry | null;
  title: string;
  variant: "main" | "secondary";
  onEditEntry: () => void;
  onEntryOpen: (entry: TimelineEntry) => void;
  onFocusItem: (item: string) => void;
  onFocusPerson: (person: string) => void;
  onScrollLeftChange: (scrollLeft: number) => void;
};

type TimelineCanvasStyle = CSSProperties & {
  "--timeline-center": string;
};

type TimelineDetailStyle = CSSProperties & {
  "--entry-color": string;
};

export function Timeline({
  entries,
  emptyMessage,
  ghostEntries = [],
  scale,
  scrollLeft,
  selectedEntryId,
  selectedEntry,
  title,
  variant,
  onEditEntry,
  onEntryOpen,
  onFocusItem,
  onFocusPerson,
  onScrollLeftChange,
}: TimelineProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const applyingScrollRef = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const positionedEntries = useMemo(() => getPositionedEntries(entries, scale), [entries, scale]);
  const positionedGhostEntries = useMemo(
    () => getPositionedEntries(ghostEntries, scale),
    [ghostEntries, scale],
  );
  const rowCount = Math.max(
    getTimelineRowCount(positionedEntries),
    getTimelineRowCount(positionedGhostEntries),
  );
  const width = getTimelineWidth(scale);
  const laneSpread = Math.ceil(Math.max(0, rowCount - 1) / 2) * 40;
  const centerY = variant === "main" ? 188 : 118;
  const selectedPositionedEntry = selectedEntry
    ? [...positionedEntries, ...positionedGhostEntries].find(
        (positionedEntry) => positionedEntry.entry.id === selectedEntry.id,
      ) ?? null
    : null;
  const hasOpenDetail = Boolean(selectedPositionedEntry);
  const lowerPadding = hasOpenDetail ? 126 : variant === "main" ? 104 : 78;
  const height =
    variant === "main"
      ? Math.max(380, centerY + laneSpread + lowerPadding)
      : Math.max(236, centerY + laneSpread + lowerPadding);
  const canvasStyle: TimelineCanvasStyle = {
    "--timeline-center": `${centerY}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
  const detailStyle: TimelineDetailStyle | undefined = selectedPositionedEntry
    ? {
        "--entry-color": selectedPositionedEntry.entry.color ?? "#6f8fa3",
        left: `${selectedPositionedEntry.left}px`,
      }
    : undefined;
  const detailEdgeClass = selectedPositionedEntry
    ? selectedPositionedEntry.left < 220
      ? "timeline-detail--edge-start"
      : selectedPositionedEntry.left > width - 220
        ? "timeline-detail--edge-end"
        : ""
    : "";

  useEffect(() => {
    const element = scrollRef.current;

    if (!element || Math.abs(element.scrollLeft - scrollLeft) < 1) {
      return undefined;
    }

    applyingScrollRef.current = true;
    element.scrollLeft = scrollLeft;

    const frame = window.requestAnimationFrame(() => {
      applyingScrollRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [scrollLeft]);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return undefined;
    }

    function updateViewportWidth(): void {
      setViewportWidth(element?.clientWidth ?? 0);
    }

    updateViewportWidth();

    if (!window.ResizeObserver) {
      window.addEventListener("resize", updateViewportWidth);
      return () => window.removeEventListener("resize", updateViewportWidth);
    }

    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  function handleScroll(event: React.UIEvent<HTMLDivElement>): void {
    if (applyingScrollRef.current) {
      return;
    }

    onScrollLeftChange(event.currentTarget.scrollLeft);
  }

  function getLabelEmphasis(entryLeft: number): number {
    const effectiveViewportWidth = viewportWidth || 1;
    const viewportCenter = scrollLeft + effectiveViewportWidth / 2;
    const distance = Math.abs(entryLeft - viewportCenter);
    const influence = Math.max(160, effectiveViewportWidth * 0.34);
    const closeness = Math.max(0, 1 - distance / influence);
    return 0.52 + closeness * 0.9;
  }

  function centerEntry(entryLeft: number): void {
    const effectiveViewportWidth = scrollRef.current?.clientWidth ?? viewportWidth;
    const maxScrollLeft = Math.max(0, width - effectiveViewportWidth);
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, entryLeft - effectiveViewportWidth / 2),
    );

    onScrollLeftChange(nextScrollLeft);
  }

  return (
    <section className={`timeline-panel timeline-panel--${variant}`} aria-label={title}>
      <div
        className="timeline-scroll"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div
          className="timeline-canvas"
          style={canvasStyle}
        >
          <div className="time-ruler" aria-hidden="true">
            {getHourTicks(scale).map((minute) => (
              <div
                className="time-tick"
                key={minute}
                style={{ left: `${(minute - scale.startMinute) * scale.pixelsPerMinute}px` }}
              >
                <span>{formatMinutesAsTime(minute)}</span>
              </div>
            ))}
          </div>

          <div className="timeline-baseline" aria-hidden="true" />

          {selectedEntry && selectedPositionedEntry && detailStyle ? (
            <div
              className={`timeline-detail ${detailEdgeClass}`}
              style={detailStyle}
              aria-live="polite"
            >
              <strong>{selectedEntry.title}</strong>
              <span>
                {selectedEntry.startTime}
                {selectedEntry.endTime ? `-${selectedEntry.endTime}` : ""}
                {selectedEntry.location ? ` · ${selectedEntry.location}` : ""}
              </span>
              {selectedEntry.description ? (
                <p>{selectedEntry.description}</p>
              ) : null}
              <div className="timeline-entry__actions" aria-label={`${selectedEntry.title} details`}>
                {selectedEntry.people.map((person) => (
                  <button
                    className="detail-chip"
                    key={`${selectedEntry.id}-person-${person}`}
                    type="button"
                    onClick={() => onFocusPerson(person)}
                  >
                    {person}
                  </button>
                ))}
                {selectedEntry.items.map((item) => (
                  <button
                    className="detail-chip detail-chip--item"
                    key={`${selectedEntry.id}-item-${item}`}
                    type="button"
                    onClick={() => onFocusItem(item)}
                  >
                    {item}
                  </button>
                ))}
                <button className="detail-chip detail-chip--edit" type="button" onClick={onEditEntry}>
                  Edit
                </button>
              </div>
            </div>
          ) : null}

          {positionedGhostEntries.map((positionedEntry) => (
            <TimelineEntryCard
              isGhost
              isSelected={positionedEntry.entry.id === selectedEntryId}
              key={`ghost-${positionedEntry.entry.id}`}
              centerY={centerY}
              positionedEntry={positionedEntry}
              labelEmphasis={getLabelEmphasis(positionedEntry.left)}
              timelineWidth={width}
              onEntryOpen={(entry) => {
                onEntryOpen(entry);
                centerEntry(positionedEntry.left);
              }}
            />
          ))}

          {positionedEntries.map((positionedEntry) => (
            <TimelineEntryCard
              isSelected={positionedEntry.entry.id === selectedEntryId}
              key={positionedEntry.entry.id}
              centerY={centerY}
              positionedEntry={positionedEntry}
              labelEmphasis={getLabelEmphasis(positionedEntry.left)}
              timelineWidth={width}
              onEntryOpen={(entry) => {
                onEntryOpen(entry);
                centerEntry(positionedEntry.left);
              }}
            />
          ))}

          {entries.length === 0 ? (
            <div className="timeline-empty">
              <span>{emptyMessage}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
