# Design — Browser 3D Preview

**Spec 2 of 7.** Renders Spec 1's scene state via React Three Fiber.

## Overview

A client-only R3F canvas subscribes to the Zustand scene store and renders the world.
The preview is purely derived: it reads state and draws it, never mutating. Object type →
mesh mapping is table-driven so it stays in lockstep with the schema's closed `ObjectType`
set (the capability-manifest discipline).

## Architecture

```text
components/
  PreviewPanel.tsx        → hosts the canvas (dynamic import, ssr:false) + overlays
  preview/
    SceneCanvas.tsx       → <Canvas>: camera, OrbitControls, lights, environment, objects
    SceneObjectView.tsx   → one object → mesh(es); dispatches primitive vs composed
    primitives.tsx        → geometry per primitive type
    composed.tsx          → grouped-primitive renderers for composed types
    Lights.tsx            → renders scene.lights + ambient floor
  PreviewErrorBoundary.tsx→ catches render errors, shows a safe fallback
```

## Key decisions

- **Client-only canvas.** `PreviewPanel` dynamically imports `SceneCanvas` with
  `ssr: false`. Three.js/WebGL cannot run during SSR, and this avoids hydration mismatch.
- **Coordinate mapping.** Scene vectors `[x, y, z]` map directly to Three.js (Y-up).
  Rotation tuples are Euler radians. Dimensions `[w, h, d]` set geometry args; `scale`
  multiplies on top via the mesh transform.
- **Table-driven dispatch.** `SceneObjectView` looks up the renderer by `object.type`.
  Primitives render a single mesh; composed types render a `<group>` of primitive meshes
  positioned relative to the object origin, then the group takes the object transform.
- **Materials.** A shared `meshStandardMaterial` reads color/metalness/roughness; `opacity`
  drives `transparent`; `emissiveIntensity` + emissive color give neon looks.
- **Live updates.** R3F re-renders on store changes because the objects array is read via
  the `useSceneStore` selector; React reconciles added/removed/changed meshes by object id
  (used as React key).

## Components and Interfaces

- `SceneCanvas`: reads `camera`, `environment`, `lights`, `objects` from the store.
  Renders `<color attach="background">`, `<PerspectiveCamera>`, `<OrbitControls>`,
  `<Lights>`, a ground grid, and `objects.map(o => <SceneObjectView key={o.id} object={o}/>)`.
- `SceneObjectView({ object })`: applies group transform, dispatches to primitive/composed.
- `primitives`: `boxGeometry` (cube), `sphereGeometry`, `cylinderGeometry`, thin `boxGeometry`
  (plane). Dimensions map to geometry args.
- `composed`: e.g. `desk` = top slab + 4 legs; `chair` = seat + back + 4 legs;
  `monitor` = panel + stand; `pc` = tower box; `lamp` = base + stem + shade; `table` = top + legs.
- `Lights`: maps light types to `<pointLight>`, `<directionalLight>`, `<ambientLight>`,
  `<spotLight>`, plus an ambient floor from `environment.ambientIntensity`.

## Testing Strategy

R3F/WebGL cannot render in jsdom, so tests focus on PURE logic, not GL output:
- Pure mapping helpers (dimensions→geometry args, material→props, light→props) are unit-tested.
- The type→renderer dispatch table covers every `ObjectType` (guards against a missing case).
- PreviewPanel renders its empty-state overlay and mounts without throwing (canvas mocked).
- Manual/dev verification: editing state via the JSON inspector visibly changes the scene.

## Error Handling
- `PreviewErrorBoundary` wraps the canvas; a render error shows a fallback message and keeps
  the rest of the app (panels, inspector) usable.
- Unknown object types are impossible by schema, but the dispatch has a defensive fallback
  (renders a neutral placeholder cube) so a future type addition degrades gracefully.
