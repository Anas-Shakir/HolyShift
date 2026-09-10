# Design — Direct Manipulation

**Spec 6 of 8.** Selection + drei TransformControls gizmo + numeric inputs, all committing
through `updateObject`.

## Overview

Selection lives in the Zustand store (`selectedId`). The viewport selects via pointer
raycasting (R3F `onClick` on each object group); the ObjectPanel selects via row click; both
read the same `selectedId`, so they stay in sync. A drei `TransformControls` gizmo attaches
to the selected object's group; on drag-end it reads the object3D transform and commits it to
the store via `updateObject`. Numeric inputs in the panel edit the same transform.

State authority is unchanged: gizmo/numeric edits are just `updateObject` calls, identical to
what the AI does. Everything (preview + Blender sync) derives from the store.

## Store changes (store/sceneStore.ts)

- Add `selectedId: string | null`, `select(id)`, `deselect()`.
- `removeObject` (and `applyAgentPatch` when it deletes) clears `selectedId` if it pointed at
  the removed object.
- No auto-sync; edits are plain state updates.

## Viewport (components/preview)

- `SceneObjectView` gains `onClick` (stopPropagation) → `select(object.id)`, and applies a
  selection highlight when `object.id === selectedId` (emissive tint or drei `<Outlines>`).
- `SceneCanvas`:
  - Reads `selectedId`; renders a `<TransformControls>` attached to the selected object's
    group ref when something is selected.
  - Background/empty-space click (onPointerMissed on the Canvas) → `deselect()`.
  - Keyboard: W/E/R switch gizmo mode (translate/rotate/scale); Escape deselects.
  - While the gizmo is dragging, disable `OrbitControls` (TransformControls emits a
    `dragging-changed` event; toggle orbit `enabled`).
- Gizmo commit: on `mouseUp`/`dragging-changed=false`, read the controlled object's
  `position`/`rotation`/`scale`, convert to tuples, and call
  `updateObject(id, { transform: { position, rotation, scale } })`.

### Attaching the gizmo to the right object
Each `SceneObjectView` renders a `<group>` with the object's transform. We keep a ref map
(object id → THREE.Group) or, more simply, have the selected `SceneObjectView` expose its
group via a callback ref stored in a small context, and `TransformControls` uses that object.
Simplest robust approach: render `<TransformControls object={selectedRef} .../>` where
`selectedRef` is set by the selected object's group.

## Numeric inputs (components/ObjectPanel or a new TransformFields)

- When `selectedId` is set, show a compact grid of 9 number inputs (pos xyz, rot xyz, scale
  xyz) for the selected object.
- Rotation shown in degrees for usability; converted to radians on write (schema stores
  radians). Position/scale as-is.
- Each input `onChange` → `updateObject(id, { transform: { <field>: [...] } })` with the
  edited component merged into the current vector.
- Inputs are controlled from the store, so gizmo/AI changes update them live.

## Testing strategy

- Store: select/deselect; selection clears when the selected object is removed; numeric-style
  `updateObject` transform merges.
- ObjectPanel: clicking a row selects (store updates); selected row highlighted; numeric
  inputs render for the selected object and edits call updateObject (assert store transform).
- Two-way: setting `selectedId` in the store highlights the panel row.
- Gizmo drag + raycast selection are GL-interactive and verified in-browser (jsdom can't
  drive WebGL). The commit logic (transform → updateObject) is factored into a pure helper
  and unit-tested with a fake object3D-like input.

## Error handling / edge cases
- Selecting then deleting: selection clears (store).
- Gizmo on a group/composed object moves the whole object (its children are relative) — correct.
- Numeric input NaN/blank: ignore the edit (keep last valid), never write an invalid transform
  (updateObject would reject it anyway via Zod, but we guard in the input).
