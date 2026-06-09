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
  centeredEntryId: string | null;
  detailEntry: TimelineEntry | null;
  selectedEntryId: string | null;
  onEditSelected: () => void;
  onEntryOpen: (entry: TimelineEntry) => void;
  onFocusItem: (item: string) => void;
  onFocusPerson: (person: string) => void;
  onCenteredEntryChange: (entry: TimelineEntry) => void;
  onEntryCenter: (entry: TimelineEntry) => void;
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
  centeredEntryId,
  detailEntry,
  selectedEntryId,
  onEditSelected,
  onEntryOpen,
  onFocusItem,
  onFocusPerson,
  onCenteredEntryChange,
  onEntryCenter,
  onFocusAssociationChange,
  onScrollLeftChange,
}: TimelineShellProps): JSX.Element {
  const [mainTimelineViewportWidth, setMainTimelineViewportWidth] = useState(0);
  const hasAssociationOverview = focus.kind === "person" || focus.kind === "item";
  const shouldShowSecondary = hasAssociationOverview;
  const associationOverviewMinute =
    hasAssociationOverview && mainTimelineViewportWidth > 0
      ? scale.startMinute + (scrollLeft + mainTimelineViewportWidth / 2) / scale.pixelsPerMinute
      : null;

  return (
    <main className="workspace">
      <div className={`timeline-detail ${detailEntry ? "" : "timeline-detail--empty"}`} aria-live="polite">
        {detailEntry ? (
          <>
            <strong>{detailEntry.title}</strong>
            <span>
              {formatEntryDate(detailEntry)} ·{" "}
              {detailEntry.startTime}
              {detailEntry.endTime ? `-${detailEntry.endTime}` : ""}
              {detailEntry.location ? ` · ${detailEntry.location}` : ""}
            </span>
            {detailEntry.description ? (
              <p>{detailEntry.description}</p>
            ) : null}
            <div className="timeline-detail__links" aria-label={`${detailEntry.title} details`}>
              {detailEntry.people.map((person) => (
                <button
                  className="detail-link"
                  key={`${detailEntry.id}-person-${person}`}
                  type="button"
                  onClick={() => onFocusPerson(person)}
                >
                  {person}
                </button>
              ))}
              {detailEntry.items.map((item) => (
                <button
                  className="detail-link"
                  key={`${detailEntry.id}-item-${item}`}
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
        centeredEntryId={centeredEntryId}
        selectedEntryId={selectedEntryId}
        title="Main timeline"
        onEntryOpen={onEntryOpen}
        onCenteredEntryChange={onCenteredEntryChange}
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
              onEntryOpen={onEntryCenter}
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
              centeredEntryId={centeredEntryId}
              selectedEntryId={selectedEntryId}
              title="Secondary timeline"
              onEntryOpen={onEntryCenter}
              onScrollLeftChange={onScrollLeftChange}
            />
          )}
        </section>
      ) : null}
    </main>
  );
}
