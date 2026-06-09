import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  formatMinutesAsDay,
  formatTimelineTick,
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
  centeredEntryId: string | null;
  selectedEntryId: string | null;
  title: string;
  variant: "main" | "secondary";
  onEntryOpen: (entry: TimelineEntry) => void;
  onCenteredEntryChange?: (entry: TimelineEntry) => void;
  onScrollLeftChange: (scrollLeft: number) => void;
  onViewportWidthChange?: (width: number) => void;
};

type TimelineCanvasStyle = CSSProperties & {
  "--timeline-center": string;
};

const LABEL_MAX_WIDTH = 170;
const LABEL_MIN_WIDTH = 24;
const LABEL_CHARACTER_WIDTH = 5.8;
const LABEL_HORIZONTAL_PADDING = 8;
const LABEL_OVERLAP_BUFFER = 8;

export function Timeline({
  entries,
  emptyMessage,
  ghostEntries = [],
  scale,
  scrollLeft,
  centeredEntryId,
  selectedEntryId,
  title,
  variant,
  onEntryOpen,
  onCenteredEntryChange,
  onScrollLeftChange,
  onViewportWidthChange,
}: TimelineProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const positionedEntries = useMemo(() => getPositionedEntries(entries, scale), [entries, scale]);
  const positionedGhostEntries = useMemo(
    () => getPositionedEntries(ghostEntries, scale),
    [ghostEntries, scale],
  );
  const positionedLabelEntries = useMemo(
    () => [...positionedEntries, ...positionedGhostEntries],
    [positionedEntries, positionedGhostEntries],
  );
  const rowCount = Math.max(
    getTimelineRowCount(positionedEntries),
    getTimelineRowCount(positionedGhostEntries),
  );
  const width = getTimelineWidth(scale);
  const laneSpread = Math.ceil(rowCount / 2) * 56;
  const centerY = variant === "main" ? 156 : 122;
  const lowerPadding = variant === "main" ? 104 : 78;
  const height =
    variant === "main"
      ? Math.max(300, centerY + laneSpread + lowerPadding)
      : Math.max(236, centerY + laneSpread + lowerPadding);
  const canvasStyle: TimelineCanvasStyle = {
    "--timeline-center": `${centerY}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
  const viewportCenter = scrollLeft + (viewportWidth || 1) / 2;
  const visibleDayLabel = formatMinutesAsDay(
    scale.startMinute + Math.max(0, scrollLeft) / scale.pixelsPerMinute,
  );
  const labelVisibility = useMemo(() => {
    const visibleEntryIds = new Set<string>();

    if (positionedLabelEntries.length === 0) {
      return visibleEntryIds;
    }

    const labelBounds = positionedLabelEntries
      .map((positionedEntry) => {
        const distance = Math.abs(positionedEntry.left - viewportCenter);
        const influence = Math.max(160, (viewportWidth || 1) * 0.34);
        const closeness = Math.max(0, 1 - distance / influence);
        const labelEmphasis = 0.52 + closeness * 0.9;
        const estimatedTextWidth = Math.min(
          LABEL_MAX_WIDTH,
          Math.max(
            LABEL_MIN_WIDTH,
            positionedEntry.entry.title.length * LABEL_CHARACTER_WIDTH + LABEL_HORIZONTAL_PADDING,
          ),
        );
        const renderedWidth = estimatedTextWidth * labelEmphasis;
        const halfWidth = renderedWidth / 2 + LABEL_OVERLAP_BUFFER;

        return {
          entryId: positionedEntry.entry.id,
          left: positionedEntry.left,
          max: positionedEntry.left + halfWidth,
          min: positionedEntry.left - halfWidth,
        };
      })
      .sort((first, second) => first.min - second.min);

    let currentGroup: typeof labelBounds = [];
    let currentMax = Number.NEGATIVE_INFINITY;

    function commitGroup(group: typeof labelBounds): void {
      if (group.length === 0) {
        return;
      }

      if (group.length === 1) {
        visibleEntryIds.add(group[0].entryId);
        return;
      }

      const hoveredInGroup = hoveredEntryId
        ? group.find((entry) => entry.entryId === hoveredEntryId)
        : undefined;
      const visibleEntry =
        hoveredInGroup ??
        group.reduce((closest, candidate) => {
          const closestDistance = Math.abs(closest.left - viewportCenter);
          const candidateDistance = Math.abs(candidate.left - viewportCenter);
          return candidateDistance < closestDistance ? candidate : closest;
        });

      visibleEntryIds.add(visibleEntry.entryId);
    }

    for (const labelBound of labelBounds) {
      if (currentGroup.length === 0 || labelBound.min <= currentMax) {
        currentGroup.push(labelBound);
        currentMax = Math.max(currentMax, labelBound.max);
      } else {
        commitGroup(currentGroup);
        currentGroup = [labelBound];
        currentMax = labelBound.max;
      }
    }

    commitGroup(currentGroup);

    return visibleEntryIds;
  }, [hoveredEntryId, positionedLabelEntries, viewportCenter, viewportWidth]);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element || Math.abs(element.scrollLeft - scrollLeft) < 1) {
      return undefined;
    }

    element.scrollLeft = scrollLeft;
  }, [scrollLeft]);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return undefined;
    }

    function updateViewportWidth(): void {
      const nextViewportWidth = element?.clientWidth ?? 0;
      setViewportWidth(nextViewportWidth);
      onViewportWidthChange?.(nextViewportWidth);
    }

    updateViewportWidth();

    if (!window.ResizeObserver) {
      window.addEventListener("resize", updateViewportWidth);
      return () => window.removeEventListener("resize", updateViewportWidth);
    }

    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [onViewportWidthChange]);

  useEffect(() => {
    if (!viewportWidth || !onCenteredEntryChange) {
      return;
    }

    const candidates = [...positionedEntries, ...positionedGhostEntries];
    if (candidates.length === 0) {
      return;
    }

    const viewportCenter = scrollLeft + viewportWidth / 2;
    const centeredEntry = candidates.reduce((closest, candidate) => {
      const closestDistance = Math.abs(closest.left - viewportCenter);
      const candidateDistance = Math.abs(candidate.left - viewportCenter);
      return candidateDistance < closestDistance ? candidate : closest;
    });

    if (centeredEntry.entry.id !== centeredEntryId) {
      onCenteredEntryChange(centeredEntry.entry);
    }
  }, [
    centeredEntryId,
    onCenteredEntryChange,
    positionedEntries,
    positionedGhostEntries,
    scrollLeft,
    viewportWidth,
  ]);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return undefined;
    }

    function handleNativeScroll(): void {
      onScrollLeftChange(element?.scrollLeft ?? 0);
    }

    element.addEventListener("scroll", handleNativeScroll, { passive: true });

    return () => element.removeEventListener("scroll", handleNativeScroll);
  }, [onScrollLeftChange]);

  function getLabelEmphasis(entryLeft: number): number {
    const effectiveViewportWidth = viewportWidth || 1;
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
      <div className="timeline-day-heading" aria-hidden="true">{visibleDayLabel}</div>
      <div
        className="timeline-scroll"
        ref={scrollRef}
      >
        <div
          className="timeline-canvas"
          style={canvasStyle}
        >
          <div className="time-ruler" aria-hidden="true">
            {getHourTicks(scale).map((minute) => (
              <div
                className={`time-tick ${minute % (24 * 60) === 0 ? "time-tick--day" : ""}`}
                key={minute}
                style={{ left: `${(minute - scale.startMinute) * scale.pixelsPerMinute}px` }}
              >
                <span>{formatTimelineTick(minute)}</span>
              </div>
            ))}
          </div>

          <div className="timeline-baseline" aria-hidden="true" />

          {positionedGhostEntries.map((positionedEntry) => (
            <TimelineEntryCard
              isGhost
              isSelected={positionedEntry.entry.id === selectedEntryId}
              key={`ghost-${positionedEntry.entry.id}`}
              centerY={centerY}
              positionedEntry={positionedEntry}
              labelEmphasis={getLabelEmphasis(positionedEntry.left)}
              showLabel={labelVisibility.has(positionedEntry.entry.id)}
              timelineWidth={width}
              onEntryOpen={(entry) => {
                onEntryOpen(entry);
                centerEntry(positionedEntry.left);
              }}
              onEntryHoverEnd={() => setHoveredEntryId(null)}
              onEntryHoverStart={setHoveredEntryId}
            />
          ))}

          {positionedEntries.map((positionedEntry) => (
            <TimelineEntryCard
              isSelected={positionedEntry.entry.id === selectedEntryId}
              key={positionedEntry.entry.id}
              centerY={centerY}
              positionedEntry={positionedEntry}
              labelEmphasis={getLabelEmphasis(positionedEntry.left)}
              showLabel={labelVisibility.has(positionedEntry.entry.id)}
              timelineWidth={width}
              onEntryOpen={(entry) => {
                onEntryOpen(entry);
                centerEntry(positionedEntry.left);
              }}
              onEntryHoverEnd={() => setHoveredEntryId(null)}
              onEntryHoverStart={setHoveredEntryId}
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
