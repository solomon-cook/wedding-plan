# Wedding-Day Timeline Planner Checklist

## Summary

Build a minimal local-first web app for planning a single wedding day around two horizontally synced timelines.

- [x] Use Vite, React, and TypeScript.
- [x] Keep Phase 1 local-only with browser localStorage and seed data.
- [x] Show the full wedding-day timeline in the main view.
- [x] Show a focused person, item, or search result in the secondary view.
- [x] Keep the secondary timeline hidden until a sub-item/focus is selected.
- [x] Keep both timelines horizontally synced so time positions stay aligned.

## Phase 0: Project Setup

- [x] Create this Markdown planning checklist.
- [x] Scaffold the Vite React TypeScript app.
- [x] Add basic project scripts for development and build.

## Phase 1: Timeline Prototype

- [x] Define the `TimelineEntry` data model.
- [x] Add useful seed wedding-day entries.
- [x] Add localStorage load/save/reset helpers.
- [x] Render the main timeline.
- [x] Render the secondary timeline.
- [x] Sync horizontal scrolling between both timelines.

## Phase 2: Focus Filtering

- [x] Support all, person, item, selected entry, and search focus modes.
- [x] Filter the secondary timeline based on the active focus.
- [x] Allow person and item chips to switch focus.
- [x] Allow entry clicks to focus the secondary timeline.

## Phase 3: Search

- [x] Search titles, types, locations, notes, people, and items.
- [x] Show grouped person, item, and entry results.
- [x] Selecting a person opens the person timeline.
- [x] Selecting an item opens the item timeline.
- [x] Selecting an entry jumps the main timeline and focuses related entries.

## Phase 4: Add And Edit

- [x] Add a form for creating entries.
- [x] Reuse the form for editing existing entries.
- [x] Validate title, type, and start time.
- [x] Store people and items as comma-separated values in Phase 1.
- [x] Persist saved changes to localStorage.

## Phase 5: Polish

- [x] Keep the interface visually quiet and mostly blank.
- [x] Restyle timeline entries as dots on a refined central axis.
- [x] Reveal event titles on dot hover/focus.
- [x] Remove visible timeline section titles and timeline container boxes.
- [x] Remove the top focus panel and move sub-item controls into the selected-dot popover.
- [x] Tidy the header around a centred page title.
- [x] Simplify event markers into plain dots with coloured hover/selection glow.
- [x] Add tiny event labels above dots that scale up near the viewport centre.
- [x] Centre-align a clicked dot by shifting the synced timeline scroll position.
- [x] Split entries into main itinerary events and operational sub-events.
- [x] Keep the main timeline to headline itinerary events by default.
- [x] Show selected main-event sub-events on the lower timeline.
- [x] Show person/item/search sub-events as ghost dots on the main timeline.
- [x] Add timeline role and parent event controls to the entry form.
- [x] Add responsive behavior for narrow screens.
- [x] Add empty states.
- [x] Add reset-to-seed-data.
- [x] Add JSON export.
- [x] Add JSON import.

## Phase 6: Future Database Evaluation

- [x] Document Prisma and SQLite as deferred for v1.
- [ ] Re-evaluate database storage if shared editing, multiple devices, or audit history become necessary.

## Acceptance Checks

- [x] Both timelines align at the same time positions.
- [x] Scrolling either timeline scrolls the other.
- [x] Main timeline entry clicks update the secondary timeline.
- [x] Secondary timeline entry clicks can also update focus.
- [x] Search works for a person, item, and event title.
- [x] Adding an entry persists after reload.
- [x] Editing an entry persists after reload.
- [x] Missing end time renders as a short entry.
- [x] Overlapping entries remain readable.
