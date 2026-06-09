import { X, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  TIMELINE_LAST_ENTRY_DATE,
  TIMELINE_START_DATE,
  WEDDING_DATE,
  formatEntryDateTime,
  normaliseEntryDate,
  parseTimeToMinutes,
} from "../lib/timeScale";
import {
  entryStatuses,
  entryTypes,
  timelineRoles,
  type EntryStatus,
  type EntryType,
  type TimelineEntry,
  type TimelineRole,
} from "../types/timeline";

type EntryFormMode = "create" | "edit";

type EntryFormProps = {
  entries: TimelineEntry[];
  entry: TimelineEntry | null;
  mode: EntryFormMode;
  onCancel: () => void;
  onDelete: (entryId: string) => void;
  onSave: (entry: TimelineEntry) => void;
};

type FormState = {
  title: string;
  type: EntryType;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: string;
  location: string;
  description: string;
  people: string;
  items: string;
  relatedEntryIds: string[];
  timelineRole: TimelineRole;
  parentEntryId: string;
  status: "" | EntryStatus;
  color: string;
};

const emptyForm: FormState = {
  title: "",
  type: "task",
  date: WEDDING_DATE,
  startTime: "10:00",
  endTime: "",
  durationMinutes: "30",
  location: "",
  description: "",
  people: "",
  items: "",
  relatedEntryIds: [],
  timelineRole: "sub",
  parentEntryId: "",
  status: "todo",
  color: "#6f8fa3",
};

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createEntryId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  if (window.crypto?.randomUUID) {
    return `${slug || "entry"}-${window.crypto.randomUUID().slice(0, 8)}`;
  }

  return `${slug || "entry"}-${Date.now()}`;
}

function getInitialForm(entry: TimelineEntry | null, mode: EntryFormMode): FormState {
  if (!entry || mode === "create") {
    return emptyForm;
  }

  return {
    title: entry.title,
    type: entry.type,
    date: normaliseEntryDate(entry.date),
    startTime: entry.startTime,
    endTime: entry.endTime ?? "",
    durationMinutes: entry.endTime ? "" : String(entry.durationMinutes ?? ""),
    location: entry.location ?? "",
    description: entry.description ?? "",
    people: entry.people.join(", "),
    items: entry.items.join(", "),
    relatedEntryIds: entry.relatedEntryIds,
    timelineRole: entry.timelineRole ?? "sub",
    parentEntryId: entry.parentEntryId ?? "",
    status: entry.status ?? "",
    color: entry.color ?? "#6f8fa3",
  };
}

export function EntryForm({
  entries,
  entry,
  mode,
  onCancel,
  onDelete,
  onSave,
}: EntryFormProps): JSX.Element {
  const [form, setForm] = useState<FormState>(() => getInitialForm(entry, mode));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(getInitialForm(entry, mode));
    setError(null);
  }, [entry, mode]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]): void {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const title = form.title.trim();
    const startMinute = parseTimeToMinutes(form.startTime);
    const endMinute = parseTimeToMinutes(form.endTime);

    if (!title) {
      setError("Title is required");
      return;
    }

    if (startMinute === null) {
      setError("Start time must be HH:MM");
      return;
    }

    if (form.endTime && endMinute === null) {
      setError("End time must be HH:MM");
      return;
    }

    if (endMinute !== null && endMinute <= startMinute) {
      setError("End time must be after start time");
      return;
    }

    const durationMinutes = form.durationMinutes ? Number(form.durationMinutes) : undefined;

    if (durationMinutes !== undefined && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
      setError("Duration must be a positive number");
      return;
    }

    const id = mode === "edit" && entry ? entry.id : createEntryId(title);
    const savedEntry: TimelineEntry = {
      id,
      title,
      type: form.type,
      date: normaliseEntryDate(form.date),
      startTime: form.startTime,
      endTime: form.endTime || undefined,
      durationMinutes: form.endTime ? undefined : durationMinutes,
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
      people: splitCommaList(form.people),
      items: splitCommaList(form.items),
      relatedEntryIds: form.relatedEntryIds.filter((relatedId) => relatedId !== id),
      timelineRole: form.timelineRole,
      parentEntryId: form.timelineRole === "sub" ? form.parentEntryId || undefined : undefined,
      status: form.status || undefined,
      color: form.color || undefined,
    };

    onSave(savedEntry);
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="entry-form__header">
        <div>
          <span className="section-label">{mode === "create" ? "New entry" : "Edit entry"}</span>
          <h2>{mode === "create" ? "Add timeline entry" : form.title || "Edit timeline entry"}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Close form"
          title="Close"
          onClick={onCancel}
        >
          <X size={18} />
        </button>
      </div>

      <label>
        <span>Title</span>
        <input
          type="text"
          value={form.title}
          onChange={(event) => updateField("title", event.currentTarget.value)}
        />
      </label>

      <div className="form-grid">
        <label>
          <span>Type</span>
          <select
            value={form.type}
            onChange={(event) => updateField("type", event.currentTarget.value as EntryType)}
          >
            {entryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField("status", event.currentTarget.value as "" | EntryStatus)}
          >
            <option value="">none</option>
            {entryStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label>
          <span>Timeline role</span>
          <select
            value={form.timelineRole}
            onChange={(event) =>
              updateField("timelineRole", event.currentTarget.value as TimelineRole)
            }
          >
            {timelineRoles.map((role) => (
              <option key={role} value={role}>
                {role === "main" ? "Main event" : "Sub-event"}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Parent event</span>
          <select
            disabled={form.timelineRole !== "sub"}
            value={form.parentEntryId}
            onChange={(event) => updateField("parentEntryId", event.currentTarget.value)}
          >
            <option value="">none</option>
            {entries
              .filter((candidate) => candidate.id !== entry?.id && candidate.timelineRole === "main")
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {formatEntryDateTime(candidate)} · {candidate.title}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label>
          <span>Date</span>
          <input
            min={TIMELINE_START_DATE}
            max={TIMELINE_LAST_ENTRY_DATE}
            type="date"
            value={form.date}
            onChange={(event) => updateField("date", event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Start</span>
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => updateField("startTime", event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          <span>End</span>
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => updateField("endTime", event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Duration</span>
          <input
            min="1"
            type="number"
            value={form.durationMinutes}
            onChange={(event) => updateField("durationMinutes", event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Colour</span>
          <input
            type="color"
            value={form.color}
            onChange={(event) => updateField("color", event.currentTarget.value)}
          />
        </label>
      </div>

      <label>
        <span>Location</span>
        <input
          type="text"
          value={form.location}
          onChange={(event) => updateField("location", event.currentTarget.value)}
        />
      </label>

      <label>
        <span>Notes</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={(event) => updateField("description", event.currentTarget.value)}
        />
      </label>

      <label>
        <span>People</span>
        <input
          type="text"
          value={form.people}
          onChange={(event) => updateField("people", event.currentTarget.value)}
        />
      </label>

      <label>
        <span>Items</span>
        <input
          type="text"
          value={form.items}
          onChange={(event) => updateField("items", event.currentTarget.value)}
        />
      </label>

      <label>
        <span>Related entries</span>
        <select
          multiple
          size={5}
          value={form.relatedEntryIds}
          onChange={(event) =>
            updateField(
              "relatedEntryIds",
              Array.from(event.currentTarget.selectedOptions).map((option) => option.value),
            )
          }
        >
          {entries
            .filter((candidate) => candidate.id !== entry?.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {formatEntryDateTime(candidate)} · {candidate.title}
              </option>
            ))}
        </select>
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="entry-form__actions">
        {mode === "edit" && entry ? (
          <button
            className="danger-button"
            type="button"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 size={16} />
            Delete
          </button>
        ) : null}
        <button className="quiet-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          Save
        </button>
      </div>
    </form>
  );
}
