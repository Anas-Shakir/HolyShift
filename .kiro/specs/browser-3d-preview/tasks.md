# Tasks — Browser 3D Preview

**Spec 2 of 7.** TDD where logic is testable; R3F GL output verified manually.

- [x] 1. R3F canvas + camera + orbit + lights/environment
  - Add three, @react-three/fiber, @react-three/drei.
  - PreviewPanel dynamically imports SceneCanvas (ssr:false) + overlays.
  - SceneCanvas: background color, perspective camera from state, OrbitControls, ground grid, Lights.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2_

- [x] 2. Primitive renderers + transform/material mapping
  - primitives.tsx (cube/sphere/cylinder/plane); pure mapping helpers (geometry args, material props).
  - SceneObjectView applies transform; dispatch table by type.
  - Tests: mapping helpers; dispatch covers all primitive types.
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Composed-object renderers
  - composed.tsx: chair/desk/table/monitor/pc/lamp as grouped primitives.
  - Tests: dispatch covers every ObjectType (no missing case).
  - _Requirements: 3.1, 3.2_

- [x] 4. Live updates + empty/loading/error states + verification
  - Objects re-render on store change (object id as key).
  - Empty-state overlay when no objects; PreviewErrorBoundary fallback.
  - Full suite + production build + dev boot check.
  - _Requirements: 4.3, 4.4, 4.5_

## Status

**Spec 2 complete.** 71 tests passing across 10 files; `npm run build` clean (canvas
code-split via dynamic import, ssr:false); dev server compiles (1716 modules) and serves
HTTP 200 with the preview mounted. Visual mesh correctness confirmed manually in-browser.
Ready for Spec 3 (AI Scene Agent).
