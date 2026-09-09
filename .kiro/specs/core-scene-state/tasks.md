# Tasks — Core Scene State (+ App Skeleton)

**Spec 1 of 7.** Implement task-by-task, TDD, commit per task. Do NOT start Spec 2 (3D) or
Spec 3 (AI) until all tasks below are done and their tests pass.

- [x] 1. Initialize Next.js project and workspace layout shell
  - Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint) deployable to Vercel.
  - Add Vitest + React Testing Library + jsdom test setup.
  - Build layout components: WorkspaceLayout, PreviewPanel (placeholder), ObjectPanel, CommandBar.
  - Tests: each of the three regions mounts.
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Define scene state schema with Zod
  - Implement lib/scene/schema.ts: Vec3, Transform, Material, ObjectType enum, SceneObject,
    Light, Camera, Environment, Scene, metadata.version; derive TS types via z.infer.
  - Tests: valid scenes pass; invalid (bad type, missing id, malformed transform) fail.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Stable ID generation and scene factory
  - Implement lib/scene/ids.ts (readable, collision-safe per-type ids).
  - Implement lib/scene/factory.ts (createEmptyScene, createDefaultObject per type).
  - Tests: id uniqueness under repeated adds; factory outputs are schema-valid for all types.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. State operations and reference resolution
  - Implement lib/scene/operations.ts (add/update/remove/updateEnvironment/updateLights/updateCamera),
    immutable + Zod-validated.
  - Implement lib/scene/resolve.ts (byId, byType, byOrdinal).
  - Tests: preserve-others, targeted merge, reject-invalid, ordinal/type resolution.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. Zustand store + ObjectPanel + JSON inspector wiring
  - Implement store/sceneStore.ts wrapping operations; status idle/loading/error.
  - Wire ObjectPanel to store; add dev-only JsonInspector to view/edit raw state.
  - Tests: store actions; ObjectPanel reflects store; inspector edit updates panel.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Serialization, persistence, cleanup
  - Implement lib/scene/serialize.ts (to/from JSON, version-aware).
  - Persist scene to localStorage; hydrate on load; export/import UI (SceneToolbar).
  - Tests: round-trip equality; reload restore; corrupt/old-version handling.
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Status

**Spec 1 complete.** 58 tests passing across 8 files; `npm run build` clean;
dev server serves the workspace (HTTP 200). Ready for Spec 2 (Browser 3D Preview).
