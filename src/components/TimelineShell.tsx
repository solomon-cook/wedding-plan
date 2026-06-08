import { Timeline } from "./Timeline";
import type { Focus, TimelineEntry, TimelineScale } from "../types/timeline";

type TimelineShellProps = {
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
  onScrollLeftChange: (scrollLeft: number) => void;
};

export function TimelineShell({
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
  onScrollLeftChange,
}: TimelineShellProps): JSX.Element {
  const shouldShowSecondary =
    focus.kind === "person" ||
    focus.kind === "item" ||
    focus.kind === "search" ||
    (focus.kind === "entry" && focusedEntries.length > 0);

  return (
    <main className="workspace">
      <Timeline
        entries={mainEntries}
        emptyMessage="No entries"
        ghostEntries={ghostEntries}
        variant="main"
        scale={scale}
        scrollLeft={scrollLeft}
        selectedEntryId={selectedEntry?.id ?? null}
        selectedEntry={selectedEntry}
        title="Main timeline"
        onEditEntry={onEditSelected}
        onEntryOpen={onEntryOpen}
        onFocusItem={onFocusItem}
        onFocusPerson={onFocusPerson}
        onScrollLeftChange={onScrollLeftChange}
      />

      {shouldShowSecondary ? (
        <Timeline
          entries={focusedEntries}
          emptyMessage={`No entries for ${focusLabel}`}
          variant="secondary"
          scale={scale}
          scrollLeft={scrollLeft}
          selectedEntryId={selectedEntry?.id ?? null}
          selectedEntry={selectedEntry}
          title="Secondary timeline"
          onEditEntry={onEditSelected}
          onEntryOpen={onEntryOpen}
          onFocusItem={onFocusItem}
          onFocusPerson={onFocusPerson}
          onScrollLeftChange={onScrollLeftChange}
        />
      ) : null}
    </main>
  );
}
