import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, RotateCcw, Upload } from "lucide-react";
import { EntryForm } from "./components/EntryForm";
import { SearchBox } from "./components/SearchBox";
import { TimelineShell } from "./components/TimelineShell";
import {
  getFocusLabel,
  getFocusedEntries,
  getGhostEntries,
  getMainTimelineEntries,
  getResponsibleItemsForPersonInEntry,
  getResponsiblePeopleForItemInEntry,
  getUniqueItems,
  getUniquePeople,
} from "./lib/timelineFilters";
import { getLeftForEntry, getTimelineWidth, createTimelineScale } from "./lib/timeScale";
import {
  createAssociationsFromEntries,
  loadAssociations,
  loadTimelineEntries,
  parseImportedTimeline,
  saveAssociations,
  resetTimelineEntries,
  saveTimelineEntries,
} from "./lib/timelineStorage";
import type { Focus, PersonItemAssociations, SearchResult, TimelineEntry } from "./types/timeline";

type ActiveForm =
  | { mode: "create" }
  | { mode: "edit"; entryId: string };

const INITIAL_CENTER_ENTRY_ID = "ceremony";

function getInitialCenteredEntryId(entries: TimelineEntry[]): string | null {
  return entries.some((entry) => entry.id === INITIAL_CENTER_ENTRY_ID)
    ? INITIAL_CENTER_ENTRY_ID
    : null;
}

function getInitialScrollLeft(entries: TimelineEntry[]): number {
  const scale = createTimelineScale();
  const centeredEntry = entries.find((entry) => entry.id === INITIAL_CENTER_ENTRY_ID);

  if (!centeredEntry) {
    return 0;
  }

  const viewportWidth =
    typeof window === "undefined" ? 0 : Math.max(0, window.innerWidth - 56);
  const maxScrollLeft = Math.max(0, getTimelineWidth(scale) - viewportWidth);
  const centeredScrollLeft = getLeftForEntry(centeredEntry, scale) - viewportWidth / 2;

  return Math.min(maxScrollLeft, Math.max(0, centeredScrollLeft));
}

export function App(): JSX.Element {
  const [entries, setEntries] = useState<TimelineEntry[]>(() => loadTimelineEntries());
  const [associations, setAssociations] = useState<PersonItemAssociations>(() =>
    loadAssociations(entries),
  );
  const [focus, setFocus] = useState<Focus>({ kind: "all" });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [centeredEntryId, setCenteredEntryId] = useState<string | null>(() =>
    getInitialCenteredEntryId(entries),
  );
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null);
  const [scrollLeft, setScrollLeft] = useState(() => getInitialScrollLeft(entries));
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveTimelineEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveAssociations(associations);
  }, [associations]);

  const scale = useMemo(() => createTimelineScale(), []);
  const mainEntries = useMemo(() => getMainTimelineEntries(entries), [entries]);
  const focusedEntries = useMemo(
    () => getFocusedEntries(entries, focus, associations),
    [associations, entries, focus],
  );
  const ghostEntries = useMemo(
    () => getGhostEntries(entries, focus, associations),
    [associations, entries, focus],
  );
  const focusLabel = useMemo(() => getFocusLabel(entries, focus), [entries, focus]);
  const associationCandidates = useMemo(
    () =>
      focus.kind === "person"
        ? getUniqueItems(entries)
        : focus.kind === "item"
          ? getUniquePeople(entries)
          : [],
    [entries, focus],
  );
  const eventResponsibilities = useMemo(
    () =>
      Object.fromEntries(
        focusedEntries.map((entry) => [
          entry.id,
          focus.kind === "person"
            ? getResponsibleItemsForPersonInEntry(associations, entry, focus.value)
            : focus.kind === "item"
              ? getResponsiblePeopleForItemInEntry(associations, entry, focus.value)
              : [],
        ]),
      ),
    [associations, focus, focusedEntries],
  );
  const selectedEntry = selectedEntryId
    ? entries.find((entry) => entry.id === selectedEntryId) ?? null
    : null;
  const centeredEntry = centeredEntryId
    ? entries.find((entry) => entry.id === centeredEntryId) ?? null
    : null;
  const detailEntry = centeredEntry ?? selectedEntry;
  const editingEntry =
    activeForm?.mode === "edit"
      ? entries.find((entry) => entry.id === activeForm.entryId) ?? null
      : null;

  function jumpToEntry(entry: TimelineEntry): void {
    const viewportWidth =
      typeof window === "undefined" ? 0 : Math.max(0, window.innerWidth - 56);
    const maxScrollLeft = Math.max(0, getTimelineWidth(scale) - viewportWidth);
    const centeredScrollLeft = getLeftForEntry(entry, scale) - viewportWidth / 2;

    setScrollLeft(Math.min(maxScrollLeft, Math.max(0, centeredScrollLeft)));
  }

  function openEntry(entry: TimelineEntry): void {
    setSelectedEntryId(entry.id);
    setCenteredEntryId(entry.id);
    setFocus({ kind: "entry", entryId: entry.id });
    setActiveForm(null);
  }

  function updateCenteredEntry(entry: TimelineEntry): void {
    setCenteredEntryId((currentEntryId) => (
      currentEntryId === entry.id ? currentEntryId : entry.id
    ));
  }

  function selectAndCenterEntry(entry: TimelineEntry): void {
    setSelectedEntryId(entry.id);
    updateCenteredEntry(entry);
    jumpToEntry(entry);
  }

  function focusPerson(person: string): void {
    setFocus({ kind: "person", value: person });
    setActiveForm(null);
  }

  function focusItem(item: string): void {
    setFocus({ kind: "item", value: item });
    setActiveForm(null);
  }

  function updateFocusAssociation(entryId: string, value: string, enabled: boolean): void {
    setAssociations((currentAssociations) => {
      if (focus.kind === "person") {
        const currentEvent = currentAssociations.eventItemPeople[entryId] ?? {};
        const currentPeople = currentEvent[value] ?? [];
        const nextPeople = enabled
          ? [...new Set([...currentPeople, focus.value])]
          : currentPeople.filter((person) => person !== focus.value);

        const nextEvent = { ...currentEvent };
        if (nextPeople.length > 0) {
          nextEvent[value] = nextPeople.sort((a, b) => a.localeCompare(b));
        } else {
          delete nextEvent[value];
        }

        return {
          eventItemPeople: {
            ...currentAssociations.eventItemPeople,
            [entryId]: nextEvent,
          },
        };
      }

      if (focus.kind === "item") {
        const currentEvent = currentAssociations.eventItemPeople[entryId] ?? {};
        const currentPeople = currentEvent[focus.value] ?? [];
        const nextPeople = enabled
          ? [...new Set([...currentPeople, value])]
          : currentPeople.filter((person) => person !== value);

        const nextEvent = { ...currentEvent };
        if (nextPeople.length > 0) {
          nextEvent[focus.value] = nextPeople.sort((a, b) => a.localeCompare(b));
        } else {
          delete nextEvent[focus.value];
        }

        return {
          eventItemPeople: {
            ...currentAssociations.eventItemPeople,
            [entryId]: nextEvent,
          },
        };
      }

      return currentAssociations;
    });
  }

  function selectSearchResult(result: SearchResult): void {
    setImportMessage(null);

    if (result.kind === "person") {
      focusPerson(result.label);
      return;
    }

    if (result.kind === "item") {
      focusItem(result.label);
      return;
    }

    const entry = entries.find((candidate) => candidate.id === result.entryId);
    if (!entry) {
      return;
    }

    setSelectedEntryId(entry.id);
    setCenteredEntryId(entry.id);
    setFocus({ kind: "entry", entryId: entry.id });
    setActiveForm(null);
    jumpToEntry(entry);
  }

  function submitSearch(query: string): void {
    setFocus({ kind: "search", query });
    setSelectedEntryId(null);
    setActiveForm(null);
  }

  function saveEntry(entry: TimelineEntry): void {
    setEntries((currentEntries) => {
      const exists = currentEntries.some((candidate) => candidate.id === entry.id);
      return exists
        ? currentEntries.map((candidate) => (candidate.id === entry.id ? entry : candidate))
        : [...currentEntries, entry];
    });
    setSelectedEntryId(entry.id);
    setCenteredEntryId(entry.id);
    setFocus({ kind: "entry", entryId: entry.id });
    setActiveForm(null);
    jumpToEntry(entry);
  }

  function deleteEntry(entryId: string): void {
    setEntries((currentEntries) =>
      currentEntries
        .filter((entry) => entry.id !== entryId)
        .map((entry) => ({
          ...entry,
          relatedEntryIds: entry.relatedEntryIds.filter((relatedId) => relatedId !== entryId),
        })),
    );
    setSelectedEntryId(null);
    setCenteredEntryId((currentEntryId) => (currentEntryId === entryId ? null : currentEntryId));
    setFocus({ kind: "all" });
    setActiveForm(null);
  }

  function resetToSeedData(): void {
    const resetEntries = resetTimelineEntries();
    const resetAssociations = createAssociationsFromEntries(resetEntries);
    setEntries(resetEntries);
    setAssociations(resetAssociations);
    setFocus({ kind: "all" });
    setSelectedEntryId(null);
    setCenteredEntryId(getInitialCenteredEntryId(resetEntries));
    setActiveForm(null);
    setScrollLeft(getInitialScrollLeft(resetEntries));
    setImportMessage("Reset to seed data");
  }

  function exportEntries(): void {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wedding-day-timeline.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importEntries(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      const imported = parseImportedTimeline(String(reader.result ?? ""));

      if (!imported) {
        setImportMessage("Import failed");
        return;
      }

      setEntries(imported);
      setAssociations(createAssociationsFromEntries(imported));
      setFocus({ kind: "all" });
      setSelectedEntryId(null);
      setCenteredEntryId(null);
      setActiveForm(null);
      setScrollLeft(0);
      setImportMessage(`Imported ${imported.length} entries`);
    };

    reader.readAsText(file);
  }

  function handleImportChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (file) {
      importEntries(file);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <button
            className="topbar__title-button"
            type="button"
            title="Show main timeline"
            onClick={() => {
              setFocus({ kind: "all" });
              setSelectedEntryId(null);
              setCenteredEntryId(getInitialCenteredEntryId(entries));
              setActiveForm(null);
            }}
          >
            Rebecca & Solomon&apos;s Wedding Timeline
          </button>
        </div>

        <SearchBox
          entries={entries}
          onSelectResult={selectSearchResult}
          onSubmitSearch={submitSearch}
        />

        <div className="topbar__actions" aria-label="Timeline actions">
          {importMessage ? <span className="topbar__message">{importMessage}</span> : null}
          <button
            className="icon-button"
            type="button"
            aria-label="Add entry"
            title="Add entry"
            onClick={() => {
              setSelectedEntryId(null);
              setCenteredEntryId(null);
              setActiveForm({ mode: "create" });
            }}
          >
            <Plus size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Export JSON"
            title="Export JSON"
            onClick={exportEntries}
          >
            <Download size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Import JSON"
            title="Import JSON"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={18} />
          </button>
          <input
            ref={importInputRef}
            aria-hidden="true"
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            onChange={handleImportChange}
          />
          <button
            className="icon-button"
            type="button"
            aria-label="Reset to seed data"
            title="Reset to seed data"
            onClick={resetToSeedData}
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <TimelineShell
        focusedEntries={focusedEntries}
        focus={focus}
        focusLabel={focusLabel}
        associationCandidates={associationCandidates}
        eventResponsibilities={eventResponsibilities}
        ghostEntries={ghostEntries}
        mainEntries={mainEntries}
        scale={scale}
        scrollLeft={scrollLeft}
        centeredEntryId={centeredEntryId}
        detailEntry={detailEntry}
        selectedEntryId={selectedEntryId}
        onEditSelected={() => {
          if (detailEntry) {
            setActiveForm({ mode: "edit", entryId: detailEntry.id });
          }
        }}
        onEntryOpen={openEntry}
        onFocusItem={focusItem}
        onFocusPerson={focusPerson}
        onCenteredEntryChange={updateCenteredEntry}
        onEntryCenter={selectAndCenterEntry}
        onFocusAssociationChange={updateFocusAssociation}
        onScrollLeftChange={setScrollLeft}
      />

      {activeForm ? (
        <aside className="entry-drawer" aria-label={activeForm.mode === "create" ? "Add entry" : "Edit entry"}>
          <EntryForm
            entries={entries}
            entry={editingEntry}
            mode={activeForm.mode}
            onCancel={() => setActiveForm(null)}
            onDelete={deleteEntry}
            onSave={saveEntry}
          />
        </aside>
      ) : null}
    </div>
  );
}
