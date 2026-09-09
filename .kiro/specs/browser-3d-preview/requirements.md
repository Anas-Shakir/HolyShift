# Requirements — Browser 3D Preview

**Spec 2 of 7.** Blueprint Stage 3. Depends on Spec 1 (Core Scene State).

## Introduction

Render the canonical, browser-authoritative scene state as a real-time 3D scene using
React Three Fiber (R3F) and Three.js. The preview is a DERIVED view of the state — it
never holds authority. When the state changes (via the JSON inspector now, the AI agent
in Spec 3), the preview updates immediately.

The preview's purpose is fast visual confirmation, not renderer parity with Blender.

## Requirements

### Requirement 1 — Canvas and camera

**User story:** As a user, I want a 3D viewport I can orbit, so that I can inspect the
scene from any angle.

#### Acceptance Criteria
1. THE PreviewPanel SHALL host an R3F canvas rendering the current scene.
2. THE canvas SHALL use the scene camera (position, target, fov) from state.
3. THE user SHALL be able to orbit, pan, and zoom the camera.
4. THE canvas SHALL render client-side only (no SSR) to avoid hydration issues.

### Requirement 2 — Primitive rendering

**User story:** As a user, I want primitives to appear as the right shapes, so that the
preview reflects my scene.

#### Acceptance Criteria
1. THE renderer SHALL render cube, sphere, cylinder, and plane objects as their shapes.
2. THE renderer SHALL apply each object's transform (position, rotation, scale).
3. THE renderer SHALL apply each object's dimensions.
4. THE renderer SHALL apply material color, metalness, roughness, opacity, and emissive.

### Requirement 3 — Composed objects

**User story:** As a user, I want composed objects (chair, desk, monitor, etc.) to look
recognizable, so that the scene reads clearly without arbitrary mesh generation.

#### Acceptance Criteria
1. THE renderer SHALL render each composed type (chair, desk, table, monitor, pc, lamp)
   as a group of primitives forming a recognizable shape.
2. Composed objects SHALL respect their transform, dimensions, and material.

### Requirement 4 — Lights, environment, live updates

**User story:** As a user, I want lighting and background to reflect state and update
live, so that changes are immediately visible.

#### Acceptance Criteria
1. THE renderer SHALL render scene lights (point/directional/ambient/spot).
2. THE renderer SHALL apply the environment background color and ambient intensity.
3. WHEN the scene state changes THEN the preview SHALL update without a manual refresh.
4. WHEN the scene has no objects THEN an empty-state hint SHALL be shown.
5. IF rendering fails THEN an error state SHALL be shown without crashing the app.

## Out of scope
- Selection/gizmos/editing in the viewport (later).
- Renderer parity with Blender (Spec 4 owns Blender output).
- Shadows/post-processing beyond basic lighting (polish, optional).
