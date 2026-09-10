# Requirements — Direct Manipulation (Select + Gizmo + Numeric Edit)

**Spec 6 of 8.** New P1 spec. Depends on Specs 1-2. Complements the AI: bulk creation by
AI, fine placement by hand.

## Introduction

Let the user select objects in the 3D viewport and adjust their placement directly — move,
rotate, scale via an on-screen gizmo, plus precise numeric inputs in the object panel. Every
change writes back through the SAME `updateObject` store action the AI patches use, so the
structured scene state remains the single source of truth and the preview + Blender sync
flow from it unchanged.

Manipulation happens entirely in the browser's Y-up scene space (the canonical space); the
Y-up→Z-up conversion already lives in the Blender compiler at sync time, so no conversion is
needed here.

## Requirements

### Requirement 1 — Selection state

**User story:** As a user, I want to select an object, so that I can act on it.

#### Acceptance Criteria
1. THE store SHALL track a `selectedId` (or null) with `select(id)` / `deselect()` actions.
2. WHEN a selected object is removed THEN the selection SHALL clear.

### Requirement 2 — Two-way selection (panel ↔ viewport)

**User story:** As a user, I want selecting in the panel and the viewport to stay in sync.

#### Acceptance Criteria
1. WHEN the user clicks an object in the viewport THEN it SHALL become selected.
2. WHEN the user clicks a row in the ObjectPanel THEN that object SHALL become selected.
3. THE selected object SHALL be visually indicated in BOTH the panel and the viewport.
4. WHEN the user clicks empty space in the viewport or presses Escape THEN selection clears.

### Requirement 3 — Transform gizmo (move / rotate / scale)

**User story:** As a user, I want to drag handles to place objects, so that placement is fast
and intuitive.

#### Acceptance Criteria
1. WHEN an object is selected THEN a transform gizmo SHALL attach to it.
2. THE gizmo SHALL support translate, rotate, and scale modes, switchable (keys W/E/R and
   on-screen buttons).
3. WHILE dragging a gizmo handle THE camera orbit SHALL be disabled (no camera drift).
4. WHEN a gizmo drag ends THEN the object's new transform SHALL be committed to the store via
   `updateObject` (state is authoritative; the change persists and is syncable).

### Requirement 4 — Numeric transform inputs (precise editing)

**User story:** As a user, I want to type exact position/rotation/scale values, so that I can
place things precisely.

#### Acceptance Criteria
1. WHEN an object is selected THEN the ObjectPanel SHALL show numeric inputs for its
   position (x,y,z), rotation (x,y,z), and scale (x,y,z).
2. WHEN the user edits an input THEN the change SHALL apply via `updateObject`.
3. THE inputs SHALL reflect the current transform (including changes made by the gizmo or AI).

### Requirement 5 — No regressions / manual sync

#### Acceptance Criteria
1. Manual edits SHALL NOT auto-sync to Blender; the existing "Sync to Blender" button pushes
   the (updated) state on demand.
2. All existing tests SHALL continue to pass; build stays clean.

## Out of scope
- Multi-select, snapping, grouping/ungrouping in the viewport.
- Undo/redo history (possible future spec).
- Editing individual group children (gizmo acts on the top-level object).
