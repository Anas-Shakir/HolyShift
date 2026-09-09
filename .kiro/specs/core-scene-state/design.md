# Design — Core Scene State (+ App Skeleton)

**Spec 1 of 7.** Implements the browser-authoritative state engine and app shell.

## Overview

A Next.js (App Router, TypeScript) application. The canonical world lives in a Zustand
store in the browser. Zod schemas are the single source of validation truth; TypeScript
types are derived from them via `z.infer`. All state mutations are pure, immutable, and
re-validated. The UI is a three-region workspace shell; a dev-only JSON inspector drives
the state until the AI (Spec 3) exists.

This spec intentionally builds NO 3D and NO AI. It is the contract every later spec depends
on, so correctness and tests come before features.

## Architecture

```text
app/ (Next.js App Router)
  layout.tsx, page.tsx        → mounts WorkspaceLayout
  components/
    WorkspaceLayout           → three regions
    PreviewPanel (placeholder)→ becomes R3F canvas in Spec 2
    ObjectPanel               → live list from store
    CommandBar                → input shell (wired to AI in Spec 3)
    JsonInspector (dev)       → view/edit raw state
lib/scene/
  schema.ts                   → Zod schemas + inferred TS types
  ids.ts                      → stable readable id generation
  factory.ts                  → empty scene + default object per type
  operations.ts               → add/update/remove/query (pure, immutable)
  resolve.ts                  → reference resolution (id/type/ordinal)
  serialize.ts                → to/from JSON, version-aware
store/
  sceneStore.ts               → Zustand store wrapping operations + persistence
```

## Components and Interfaces

### Schema (lib/scene/schema.ts)
- `Vec3 = [number, number, number]`.
- `TransformSchema = { position: Vec3, rotation: Vec3, scale: Vec3 }`.
- `MaterialSchema = { color: string (hex), metalness: 0..1, roughness: 0..1 }`.
- `ObjectTypeSchema` = enum of core primitives + composed types (closed set → aligns with
  the future capability manifest in Spec 3/4).
- `SceneObjectSchema = { id, type, name, transform, dimensions: Vec3, material, parentId? }`.
- `LightSchema`, `CameraSchema`, `EnvironmentSchema`.
- `SceneSchema = { metadata: { version, name?, createdAt }, objects[], lights[], camera, environment }`.
- Types via `z.infer`. `SCHEMA_VERSION` constant exported.

### IDs (lib/scene/ids.ts)
- `makeId(type, existingIds)` → `${type}_${nn}` zero-padded, collision-safe by scanning
  existing ids and picking the next free ordinal per type.

### Factory (lib/scene/factory.ts)
- `createEmptyScene()` → valid Scene with default camera/environment, empty arrays.
- `createDefaultObject(type, existingIds)` → schema-valid SceneObject with sensible defaults
  per type (dimensions, material, transform at origin).

### Operations (lib/scene/operations.ts) — pure, immutable, validated
- `addObject(scene, partialOrType)` → Scene.
- `updateObject(scene, id, patch)` → deep-merges transform/dimensions/material only.
- `removeObject(scene, id)` → Scene.
- `updateEnvironment(scene, patch)`, `updateLights(scene, lights)`, `updateCamera(scene, patch)`.
- Every operation ends with `SceneSchema.parse(next)`; throws (caught by store) on invalid.

### Resolution (lib/scene/resolve.ts)
- `byId(scene, id)`, `byType(scene, type)` → SceneObject[],
- `byOrdinal(scene, type, n)` → the nth object of a type (1-indexed for "second monitor").

### Store (store/sceneStore.ts)
- Zustand store: `{ scene, status: 'idle'|'loading'|'error', error?, actions... }`.
- Actions wrap operations; on validation error set status='error' + message, keep prior scene.
- Persistence: subscribe → write serialized scene to localStorage (debounced); hydrate on init.

### Serialization (lib/scene/serialize.ts)
- `serialize(scene)` → string; `deserialize(str)` → Scene | throws typed error.
- Version check against `SCHEMA_VERSION`: unknown/old → controlled handling, never crash.

## Data Models
See schema above. Vectors are plain 3-tuples for R3F compatibility (Spec 2). Colors are hex
strings for both CSS and Three.js.

## Error Handling
- Operations throw on invalid → store catches, sets error status, preserves last-good scene.
- Deserialization guards version + shape; corrupt input → typed error surfaced in UI.
- JSON inspector edits are validated before commit; invalid edits show the error, no crash.

## Testing Strategy (TDD, Vitest + React Testing Library)
- Schema: valid/invalid fixtures.
- ids: uniqueness + readable format under repeated adds.
- factory: every type produces schema-valid objects; empty scene valid.
- operations: preserve-others, targeted-merge, reject-invalid; resolve ordinal/type.
- store: actions mutate, error path preserves state.
- components: three regions mount; ObjectPanel reflects store; inspector edit → panel update.
- serialize: round-trip equality; version/corrupt handling.

## Deployment
- Vercel free tier. Static shell deploys after Task 1; persistent state engine after Task 6.
