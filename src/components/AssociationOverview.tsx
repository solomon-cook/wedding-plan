import { Download, Plus, X } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { formatEntryDateTime, getEntryStartMinute } from "../lib/timeScale";
import type { Focus, TimelineEntry } from "../types/timeline";

type AssociationOverviewProps = {
  candidateValues: string[];
  currentMinute: number | null;
  entries: TimelineEntry[];
  eventResponsibilities: Record<string, string[]>;
  focus: Extract<Focus, { kind: "person" | "item" }>;
  focusLabel: string;
  onAssociationToggle: (entryId: string, value: string, enabled: boolean) => void;
  onEntryOpen: (entry: TimelineEntry) => void;
  onFocusAssociation: (value: string) => void;
};

type SaveFilePickerOptions = {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
};

type WritableFileHandle = {
  createWritable: () => Promise<{
    close: () => Promise<void>;
    write: (data: Blob) => Promise<void>;
  }>;
};

type WindowWithSaveFilePicker = Window & {
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<WritableFileHandle>;
};

type OverviewExportData = {
  associationLabel: string;
  entries: TimelineEntry[];
  eventResponsibilities: Record<string, string[]>;
  focusKind: "person" | "item";
  focusLabel: string;
};

type ExportPreview = {
  fileName: string;
  url: string;
};

type OverviewEventStyle = CSSProperties & {
  "--overview-event-position": string;
};

type OverviewScrubberStyle = CSSProperties & {
  "--overview-scrubber-progress": string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "overview";
}

function getOverviewEventPosition(index: number, total: number): number {
  if (total <= 1) {
    return 0.5;
  }

  return index / (total - 1);
}

function getOverviewScrubberProgress(entries: TimelineEntry[], currentMinute: number | null): number | null {
  if (currentMinute === null || entries.length === 0) {
    return null;
  }

  if (entries.length === 1) {
    return getOverviewEventPosition(0, entries.length);
  }

  const startMinutes = entries.map(getEntryStartMinute);
  const lastIndex = entries.length - 1;

  if (currentMinute <= startMinutes[0]) {
    return getOverviewEventPosition(0, entries.length);
  }

  if (currentMinute >= startMinutes[lastIndex]) {
    return getOverviewEventPosition(lastIndex, entries.length);
  }

  for (let index = 0; index < lastIndex; index += 1) {
    const segmentStartMinute = startMinutes[index];
    const segmentEndMinute = startMinutes[index + 1];

    if (currentMinute <= segmentEndMinute) {
      const segmentStartPosition = getOverviewEventPosition(index, entries.length);
      const segmentEndPosition = getOverviewEventPosition(index + 1, entries.length);

      if (segmentEndMinute <= segmentStartMinute) {
        return segmentStartPosition;
      }

      const segmentProgress =
        (currentMinute - segmentStartMinute) / (segmentEndMinute - segmentStartMinute);

      return segmentStartPosition + (segmentEndPosition - segmentStartPosition) * segmentProgress;
    }
  }

  return getOverviewEventPosition(lastIndex, entries.length);
}

function triggerDownload(blob: Blob, fileName: string): void {
  const jpegUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = jpegUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(jpegUrl);
}

function openPreparingPreview(): Window | null {
  const previewWindow = window.open("", "_blank");

  if (!previewWindow) {
    return null;
  }

  previewWindow.document.title = "Preparing JPEG";
  previewWindow.document.body.style.margin = "0";
  previewWindow.document.body.style.background = "#f8f3ea";
  previewWindow.document.body.style.color = "#263f3a";
  previewWindow.document.body.style.fontFamily = "serif";
  previewWindow.document.body.innerHTML = `
    <main style="display:grid;min-height:100vh;place-items:center;padding:24px;text-align:center;">
      <p style="font-size:18px;">Preparing JPEG...</p>
    </main>
  `;

  return previewWindow;
}

function showJpegPreview(previewWindow: Window | null, blob: Blob, fileName: string): void {
  if (!previewWindow) {
    return;
  }

  const jpegUrl = URL.createObjectURL(blob);
  previewWindow.document.title = fileName;
  previewWindow.document.body.innerHTML = `
    <main style="box-sizing:border-box;display:grid;gap:16px;min-height:100vh;padding:18px;background:#f8f3ea;color:#263f3a;">
      <a href="${jpegUrl}" download="${fileName}" style="justify-self:end;color:#263f3a;text-decoration:underline;font:14px sans-serif;">
        Download JPEG
      </a>
      <img src="${jpegUrl}" alt="${fileName}" style="display:block;max-width:100%;height:auto;margin:0 auto;box-shadow:0 12px 40px rgba(38,63,58,0.14);" />
    </main>
  `;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function chooseJpegSaveHandle(fileName: string): Promise<WritableFileHandle | null | undefined> {
  const saveFilePicker = (window as WindowWithSaveFilePicker).showSaveFilePicker;

  if (!saveFilePicker) {
    return undefined;
  }

  try {
    return await saveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: "JPEG image",
          accept: { "image/jpeg": [".jpg", ".jpeg"] },
        },
      ],
    });
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }

    return undefined;
  }
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth || !currentLine) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): void {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

async function renderOverviewAsJpegBlob(data: OverviewExportData): Promise<Blob | null> {
  const scale = 2;
  const width = 1400;
  const padding = 72;
  const eventStripHeight = 190;
  const rowGap = 20;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.font = "20px Georgia, serif";
  const rowHeights = data.entries.map((entry) => {
    const values = data.eventResponsibilities[entry.id] ?? [];
    const text = values.length > 0 ? values.join(", ") : "None selected";
    const lines = wrapCanvasText(context, text, width - padding * 2 - 300);

    return Math.max(58, lines.length * 26 + 20);
  });
  const height =
    padding * 2 +
    78 +
    eventStripHeight +
    40 +
    rowHeights.reduce((total, rowHeight) => total + rowHeight + rowGap, 0);

  canvas.width = width * scale;
  canvas.height = height * scale;
  context.scale(scale, scale);
  context.fillStyle = "#f8f3ea";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#6d6760";
  context.font = "22px Georgia, serif";
  context.fillText(data.focusKind === "person" ? "Person overview" : "Item overview", padding, padding);

  context.fillStyle = "#16201d";
  context.font = "56px Georgia, serif";
  context.fillText(data.focusLabel, padding, padding + 58);

  const stripTop = padding + 128;
  const lineY = stripTop + 52;
  const firstX = padding + 60;
  const lastX = width - padding - 60;
  const step = data.entries.length > 1 ? (lastX - firstX) / (data.entries.length - 1) : 0;

  context.strokeStyle = "rgba(50,44,35,0.28)";
  context.setLineDash([2, 8]);
  context.beginPath();
  context.moveTo(firstX, lineY);
  context.lineTo(lastX, lineY);
  context.stroke();
  context.setLineDash([]);

  data.entries.forEach((entry, index) => {
    const x = data.entries.length > 1 ? firstX + index * step : width / 2;
    const values = data.eventResponsibilities[entry.id] ?? [];
    const smallText = values.join(", ");

    context.fillStyle = "#2d5d62";
    context.beginPath();
    context.arc(x, lineY, 9, 0, Math.PI * 2);
    context.fill();

    context.textAlign = "center";
    context.fillStyle = "#16201d";
    context.font = "18px Georgia, serif";
    context.fillText(entry.title, x, lineY + 34, 128);

    context.fillStyle = "#6d6760";
    context.font = "14px Georgia, serif";
    context.fillText(formatEntryDateTime(entry), x, lineY + 56, 128);

    if (smallText) {
      context.fillStyle = "rgba(109,103,96,0.82)";
      context.font = "12px Georgia, serif";
      context.fillText(smallText, x, lineY + 76, 128);
    }
  });

  context.textAlign = "left";
  let y = stripTop + eventStripHeight + 22;
  context.fillStyle = "#6d6760";
  context.font = "22px Georgia, serif";
  context.fillText(`${data.associationLabel} by event`, padding, y);
  y += 34;

  data.entries.forEach((entry, index) => {
    const values = data.eventResponsibilities[entry.id] ?? [];
    const text = values.length > 0 ? values.join(", ") : "None selected";
    const rowHeight = rowHeights[index];

    context.strokeStyle = "rgba(50,44,35,0.2)";
    context.setLineDash([2, 7]);
    context.beginPath();
    context.moveTo(padding, y - 14);
    context.lineTo(width - padding, y - 14);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#16201d";
    context.font = "22px Georgia, serif";
    context.fillText(entry.title, padding, y + 14, 240);

    context.fillStyle = "#6d6760";
    context.font = "16px Georgia, serif";
    context.fillText(formatEntryDateTime(entry), padding, y + 40, 240);

    context.fillStyle = "#263f3a";
    context.font = "20px Georgia, serif";
    drawTextBlock(
      context,
      wrapCanvasText(context, text, width - padding * 2 - 300),
      padding + 300,
      y + 18,
      26,
    );

    y += rowHeight + rowGap;
  });

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });
}

async function exportOverviewAsJpeg(data: OverviewExportData, fileName: string): Promise<Blob | null> {
  const canUseSavePicker =
    typeof (window as WindowWithSaveFilePicker).showSaveFilePicker === "function";
  const fallbackPreview = canUseSavePicker ? null : openPreparingPreview();
  const saveHandle = await chooseJpegSaveHandle(fileName);

  if (saveHandle === null) {
    fallbackPreview?.close();
    return null;
  }

  const jpegBlob = await renderOverviewAsJpegBlob(data);

  if (!jpegBlob) {
    fallbackPreview?.close();
    return null;
  }

  if (saveHandle) {
    const writable = await saveHandle.createWritable();
    await writable.write(jpegBlob);
    await writable.close();
    return jpegBlob;
  }

  triggerDownload(jpegBlob, fileName);
  showJpegPreview(fallbackPreview, jpegBlob, fileName);
  return jpegBlob;
}

export function AssociationOverview({
  candidateValues,
  currentMinute,
  entries,
  eventResponsibilities,
  focus,
  focusLabel,
  onAssociationToggle,
  onEntryOpen,
  onFocusAssociation,
}: AssociationOverviewProps): JSX.Element {
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);
  const associationLabel = focus.kind === "person" ? "Items" : "People";
  const scrubberProgress = getOverviewScrubberProgress(entries, currentMinute);

  function toggleExpandedEntry(entryId: string): void {
    setExpandedEntryIds((currentEntryIds) => {
      const nextEntryIds = new Set(currentEntryIds);

      if (nextEntryIds.has(entryId)) {
        nextEntryIds.delete(entryId);
      } else {
        nextEntryIds.add(entryId);
      }

      return nextEntryIds;
    });
  }

  async function handleExportClick(): Promise<void> {
    const fileName = `${slugify(focusLabel)}-overview.jpg`;
    const jpegBlob = await exportOverviewAsJpeg(
      {
        associationLabel,
        entries,
        eventResponsibilities,
        focusKind: focus.kind,
        focusLabel,
      },
      fileName,
    );

    if (!jpegBlob) {
      return;
    }

    setExportPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview.url);
      }

      return {
        fileName,
        url: URL.createObjectURL(jpegBlob),
      };
    });
  }

  return (
    <section className="association-overview" aria-label={`${focusLabel} overview`}>
      <div className="association-overview__header">
        <div>
          <span className="association-overview__eyebrow">
            {focus.kind === "person" ? "Person overview" : "Item overview"}
          </span>
          <h3>{focusLabel}</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          data-export-hidden="true"
          aria-label={`Export ${focusLabel} overview as JPEG`}
          title="Export JPEG"
          onClick={() => void handleExportClick()}
        >
          <Download size={16} />
        </button>
      </div>

      {exportPreview ? (
        <div className="association-export-ready">
          <a href={exportPreview.url} download={exportPreview.fileName}>
            JPEG ready
          </a>
        </div>
      ) : null}

      <div className="association-overview__events" aria-label={`${focusLabel} events`}>
        <div className="association-overview__event-track">
          {scrubberProgress !== null ? (
            <span
              className="association-overview__scrubber"
              aria-hidden="true"
              style={{
                "--overview-scrubber-progress": `${scrubberProgress * 100}%`,
              } as OverviewScrubberStyle}
            />
          ) : null}
          {entries.map((entry, index) => {
            const eventStyle: OverviewEventStyle = {
              "--overview-event-position": `${getOverviewEventPosition(index, entries.length) * 100}%`,
            };

            return (
              <button
                className="association-overview__event"
                key={entry.id}
                style={eventStyle}
                type="button"
                onClick={() => onEntryOpen(entry)}
              >
                <span className="association-overview__dot" />
                <strong>{entry.title}</strong>
                <span>{formatEntryDateTime(entry)}</span>
                <small>
                  {(eventResponsibilities[entry.id] ?? []).join(", ")}
                </small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="association-overview__associations">
        <span className="association-overview__label">
          {associationLabel} by event
        </span>
        <div className="association-overview__matrix">
          {entries.map((entry) => (
            <div className="association-event-row" key={entry.id}>
              <div className="association-event-row__meta">
                <strong>{entry.title}</strong>
                <span>{formatEntryDateTime(entry)}</span>
              </div>
              <div className="association-overview__checks">
                {(() => {
                  const responsibleValues = eventResponsibilities[entry.id] ?? [];
                  const isExpanded = expandedEntryIds.has(entry.id);
                  const visibleValues = isExpanded
                    ? candidateValues
                    : candidateValues.filter((value) => responsibleValues.includes(value));

                  return (
                    <>
                      {visibleValues.map((value) => (
                        <label className="association-check" key={`${entry.id}-${value}`}>
                          <input
                            type="checkbox"
                            checked={responsibleValues.includes(value)}
                            onChange={(event) =>
                              onAssociationToggle(entry.id, value, event.currentTarget.checked)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => onFocusAssociation(value)}
                          >
                            {value}
                          </button>
                        </label>
                      ))}
                      <button
                        className="association-expand-button"
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? `Hide unselected ${associationLabel.toLowerCase()} for ${entry.title}`
                            : `Show all ${associationLabel.toLowerCase()} for ${entry.title}`
                        }
                        title={isExpanded ? "Hide unselected" : "Show all"}
                        onClick={() => toggleExpandedEntry(entry.id)}
                      >
                        {isExpanded ? <X size={14} /> : <Plus size={14} />}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
