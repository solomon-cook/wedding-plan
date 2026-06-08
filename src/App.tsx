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
} from "./lib/timelineFilters";
import { getLeftForTime, createTimelineScale } from "./lib/timeScale";
import {
  loadTimelineEntries,
  parseImportedTimeline,
  resetTimelineEntries,
  saveTimelineEntries,
} from "./lib/timelineStorage";
import type { Focus, SearchResult, TimelineEntry } from "./types/timeline";

type ActiveForm =
  | { mode: "create" }
  | { mode: "edit"; entryId: string };

export function App(): JSX.Element {
  const [entries, setEntries] = useState<TimelineEntry[]>(() => loadTimelineEntries());
  const [focus, setFocus] = useState<Focus>({ kind: "all" });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveTimelineEntries(entries);
  }, [entries]);

  const scale = useMemo(() => createTimelineScale(entries), [entries]);
  const mainEntries = useMemo(() => getMainTimelineEntries(entries), [entries]);
  const focusedEntries = useMemo(() => getFocusedEntries(entries, focus), [entries, focus]);
  const ghostEntries = useMemo(() => getGhostEntries(entries, focus), [entries, focus]);
  const focusLabel = useMemo(() => getFocusLabel(entries, focus), [entries, focus]);
  const selectedEntry = selectedEntryId
    ? entries.find((entry) => entry.id === selectedEntryId) ?? null
    : null;
  const editingEntry =
    activeForm?.mode === "edit"
      ? entries.find((entry) => entry.id === activeForm.entryId) ?? null
      : null;

  function jumpToEntry(entry: TimelineEntry): void {
    setScrollLeft(Math.max(0, getLeftForTime(entry.startTime, scale) - 160));
  }

  function openEntry(entry: TimelineEntry): void {
    setSelectedEntryId(entry.id);
    setFocus({ kind: "entry", entryId: entry.id });
    setActiveForm(null);
  }

  function focusPerson(person: string): void {
    setFocus({ kind: "person", value: person });
    setSelectedEntryId(null);
    setActiveForm(null);
  }

  function focusItem(item: string): void {
    setFocus({ kind: "item", value: item });
    setSelectedEntryId(null);
    setActiveForm(null);
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
    setFocus({ kind: "all" });
    setActiveForm(null);
  }

  function resetToSeedData(): void {
    const resetEntries = resetTimelineEntries();
    setEntries(resetEntries);
    setFocus({ kind: "all" });
    setSelectedEntryId(null);
    setActiveForm(null);
    setScrollLeft(0);
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
      setFocus({ kind: "all" });
      setSelectedEntryId(null);
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
              setActiveForm(null);
            }}
          >
            Wedding day
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
        ghostEntries={ghostEntries}
        mainEntries={mainEntries}
        scale={scale}
        scrollLeft={scrollLeft}
        selectedEntry={selectedEntry}
        onEditSelected={() => {
          if (selectedEntry) {
            setActiveForm({ mode: "edit", entryId: selectedEntry.id });
          }
        }}
        onEntryOpen={openEntry}
        onFocusItem={focusItem}
        onFocusPerson={focusPerson}
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
