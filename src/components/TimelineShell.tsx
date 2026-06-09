import { useState } from "react";
import { AssociationOverview } from "./AssociationOverview";
import { Timeline } from "./Timeline";
import type { Focus, TimelineEntry, TimelineScale } from "../types/timeline";
import { formatEntryDate } from "../lib/timeScale";

type TimelineShellProps = {
  associationCandidates: string[];
  eventResponsibilities: Record<string, string[]>;
  focusedEntries: TimelineEntry[];
  focus: Focus;
  focusLabel: string;
  ghostEntries: TimelineEntry[];
  mainEntries: TimelineEntry[];
  scale: TimelineScale;
  scrollLeft: number;
  selectedEntry: TimelineEntry | null;
  onEditSelected: () => void;
  onEntryOpen: (entry: TimelineEntry) => void;
  onFocusItem: (item: string) => void;
  onFocusPerson: (person: string) => void;
  onCenteredEntryChange: (entry: TimelineEntry) => void;
  onFocusAssociationChange: (entryId: string, value: string, enabled: boolean) => void;
  onScrollLeftChange: (scrollLeft: number) => void;
};

export function TimelineShell({
  associationCandidates,
  eventResponsibilities,
  focusedEntries,
  focus,
  focusLabel,
  ghostEntries,
  mainEntries,
  scale,
  scrollLeft,
  selectedEntry,
  onEditSelected,
  onEntryOpen,
  onFocusItem,
  onFocusPerson,
  onCenteredEntryChange,
  onFocusAssociationChange,
  onScrollLeftChange,
}: TimelineShellProps): JSX.Element {
  const [mainTimelineViewportWidth, setMainTimelineViewportWidth] = useState(0);
  const hasAssociationOverview = focus.kind === "person" || focus.kind === "item";
  const shouldShowSecondary =
    hasAssociationOverview ||
    focus.kind === "search" ||
    (focus.kind === "entry" && focusedEntries.length > 0);
  const associationOverviewMinute =
    hasAssociationOverview && mainTimelineViewportWidth > 0
      ? scale.startMinute + (scrollLeft + mainTimelineViewportWidth / 2) / scale.pixelsPerMinute
      : null;

  return (
    <main className="workspace">
      <div className={`timeline-detail ${selectedEntry ? "" : "timeline-detail--empty"}`} aria-live="polite">
        {selectedEntry ? (
          <>
            <strong>{selectedEntry.title}</strong>
            <span>
              {formatEntryDate(selectedEntry)} ·{" "}
              {selectedEntry.startTime}
              {selectedEntry.endTime ? `-${selectedEntry.endTime}` : ""}
              {selectedEntry.location ? ` · ${selectedEntry.location}` : ""}
            </span>
            {selectedEntry.description ? (
              <p>{selectedEntry.description}</p>
            ) : null}
            <div className="timeline-detail__links" aria-label={`${selectedEntry.title} details`}>
              {selectedEntry.people.map((person) => (
                <button
                  className="detail-link"
                  key={`${selectedEntry.id}-person-${person}`}
                  type="button"
                  onClick={() => onFocusPerson(person)}
                >
                  {person}
                </button>
              ))}
              {selectedEntry.items.map((item) => (
                <button
                  className="detail-link"
                  key={`${selectedEntry.id}-item-${item}`}
                  type="button"
                  onClick={() => onFocusItem(item)}
                >
                  {item}
                </button>
              ))}
              <button className="detail-link detail-link--edit" type="button" onClick={onEditSelected}>
                Edit
              </button>
            </div>
          </>
        ) : null}
      </div>

      <Timeline
        entries={mainEntries}
        emptyMessage="No entries"
        ghostEntries={ghostEntries}
        variant="main"
        scale={scale}
        scrollLeft={scrollLeft}
        selectedEntryId={selectedEntry?.id ?? null}
        title="Main timeline"
        onEntryOpen={onEntryOpen}
        onCenteredEntryChange={shouldShowSecondary ? undefined : onCenteredEntryChange}
        onScrollLeftChange={onScrollLeftChange}
        onViewportWidthChange={setMainTimelineViewportWidth}
      />

      {shouldShowSecondary ? (
        <section className="timeline-focus" aria-label={`${focusLabel} timeline`}>
          {hasAssociationOverview ? (
            <AssociationOverview
              candidateValues={associationCandidates}
              currentMinute={associationOverviewMinute}
              entries={focusedEntries}
              eventResponsibilities={eventResponsibilities}
              focus={focus}
              focusLabel={focusLabel}
              onAssociationToggle={onFocusAssociationChange}
              onEntryOpen={onCenteredEntryChange}
              onFocusAssociation={focus.kind === "person" ? onFocusItem : onFocusPerson}
            />
          ) : (
            <h2 className="timeline-focus__heading">{focusLabel}</h2>
          )}
          {hasAssociationOverview ? null : (
            <Timeline
              entries={focusedEntries}
              emptyMessage={`No entries for ${focusLabel}`}
              variant="secondary"
              scale={scale}
              scrollLeft={scrollLeft}
              selectedEntryId={selectedEntry?.id ?? null}
              title="Secondary timeline"
              onEntryOpen={onCenteredEntryChange}
              onCenteredEntryChange={onCenteredEntryChange}
              onScrollLeftChange={onScrollLeftChange}
            />
          )}
        </section>
      ) : null}
    </main>
  );
}
