# Requirements — Core Scene State (+ App Skeleton)

**Spec 1 of 7.** Blueprint Stages 1-2. Foundation for every later spec.

## Introduction

This spec establishes the deployable Next.js application shell and the canonical,
browser-authoritative structured scene state engine. The structured scene state is the
single source of truth for the entire product; the 3D preview (Spec 2) and Blender
(Spec 4) are both derived views of this state.

No AI (Spec 3) or 3D rendering (Spec 2) is built here. The exit condition is: a complete
scene can be represented and modified — and the change is observable in the UI — without
any AI, backed by tests, and deployed live.

## Glossary

- **Scene / World**: the complete structured representation of a 3D world.
- **SceneObject**: a single entity in the world (primitive or composed) with a stable id.
- **Scene state authority**: the browser holds the canonical state (Zustand store).
- **Capability**: an object type / material property / light type the system supports.

## Requirements

### Requirement 1 — Application skeleton

**User story:** As a user, I want to open the app and see the full workspace layout, so
that I understand the workflow before any AI or 3D exists.

#### Acceptance Criteria
1. WHEN the app loads THEN the system SHALL display three regions: a 3D preview area
   (placeholder), a scene/object panel, and an AI command input.
2. WHEN the app is built THEN it SHALL deploy to Vercel as a working static shell.
3. THE layout SHALL be composed of discrete components (WorkspaceLayout, PreviewPanel,
   ObjectPanel, CommandBar) each covered by a render test.

### Requirement 2 — Structured scene schema

**User story:** As a developer, I want a strict, validated schema for the world, so that
every later layer (AI, preview, compiler) shares one contract.

#### Acceptance Criteria
1. THE schema SHALL define Scene { metadata, objects[], lights[], camera, environment }.
2. THE schema SHALL define SceneObject { id, type, name, transform{position,rotation,scale},
   dimensions, material, parentId }.
3. THE schema SHALL enumerate supported types: core primitives (cube, sphere, cylinder,
   plane) and composed types (chair, desk, monitor, and extensible others).
4. THE metadata SHALL include a schema `version` for forward compatibility.
5. WHEN a valid scene is validated THEN it SHALL pass; WHEN an invalid scene (bad type,
   missing id, malformed transform) is validated THEN it SHALL fail with a useful error.
6. Zod SHALL be the single source of validation truth; TypeScript types SHALL be derived
   from the Zod schemas.

### Requirement 3 — Stable identifiers and object factory

**User story:** As the future AI agent, I want stable, readable ids, so that references
like "the second monitor" can be resolved reliably.

#### Acceptance Criteria
1. WHEN an object is created THEN the system SHALL assign a stable, human-readable, unique
   id (e.g. `chair_01`).
2. WHEN multiple objects of the same type are created THEN ids SHALL not collide.
3. THE system SHALL provide a factory that produces a schema-valid default object for every
   supported type.
4. THE system SHALL provide a factory that produces a valid empty scene.

### Requirement 4 — State operations

**User story:** As a user, I want to add, update, and remove objects while everything else
stays intact, so that iterative editing preserves my work.

#### Acceptance Criteria
1. THE system SHALL provide addObject, updateObject, removeObject, updateEnvironment,
   updateLights, updateCamera operations.
2. WHEN updateObject is applied THEN it SHALL merge only the targeted fields (transform,
   dimensions, material) and preserve untouched fields.
3. WHEN any operation is applied THEN unaffected objects SHALL remain unchanged.
4. WHEN an operation would produce an invalid scene THEN it SHALL be rejected.
5. ALL operations SHALL be immutable (return new state) and Zod-validated after each change.
6. THE system SHALL provide reference resolution: by id, by type, and by ordinal
   (e.g. "second monitor").

### Requirement 5 — Store, object panel, and JSON inspector

**User story:** As a developer, I want to drive and observe the state from the UI, so that
I can build and debug the world before the AI exists.

#### Acceptance Criteria
1. THE scene state SHALL live in a Zustand store exposing the Requirement 4 operations.
2. WHEN the store changes THEN the ObjectPanel SHALL reflect the current objects.
3. THE app SHALL include a dev-only JSON inspector to view and edit raw state.
4. WHEN raw state is edited via the inspector THEN the ObjectPanel SHALL update.
5. THE UI SHALL represent loading and error states.

### Requirement 6 — Serialization and persistence

**User story:** As a user, I want my scene to survive a reload and be exportable, so that
my work is not lost.

#### Acceptance Criteria
1. THE system SHALL serialize a scene to JSON and deserialize it back losslessly.
2. WHEN the browser reloads THEN the last scene SHALL be restored from localStorage.
3. WHEN deserializing unknown/old schema versions THEN the system SHALL handle it gracefully
   (reject or upgrade), never crash.
4. THE user SHALL be able to export and re-import a scene JSON.

## Out of scope (this spec)
- 3D rendering (Spec 2), AI agent (Spec 3), Blender sync (Spec 4).
- Server-side persistence (browser localStorage only for MVP).
