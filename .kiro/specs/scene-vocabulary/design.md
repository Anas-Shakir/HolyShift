# Design — Scene Vocabulary Expansion

**Spec 5 of 8.** Expands what scenes can contain while preserving deterministic compilation.

## Overview

Three additions, all keeping the "AI emits structured intent, deterministic compiler draws
known parts" principle:

1. New primitives: `cone`, `torus`, `prism` (triangular wedge).
2. A `group` object: `children` is a list of primitive sub-shapes with local transforms.
   The AI composes novel objects (plant, lamp post, sign…) from primitives at request time.
3. Seeded composed types: `plant`, `bookshelf`, `sofa`, `bed`, `rug`, `window`, `door`,
   `mug`, `bottle`, `stool`, `streetlight` — pre-built part layouts, reliable and fast.

Everything moves in lockstep: schema (Spec 1) → renderer (Spec 2) → compiler (Spec 4) → AI
manifest/prompt (Spec 3). A single closed `ObjectType` enum remains the contract; `group`
is just another entry whose renderer/compiler read `children`.

## Data model changes (lib/scene/schema.ts)

- `ObjectTypeSchema` gains: `cone`, `torus`, `prism`, `group`, and the seeded composed types.
- New `GroupChildSchema`:
  ```
  GroupChild = {
    type: PrimitiveType,           // cube|sphere|cylinder|plane|cone|torus|prism only
    position: Vec3,                // local, relative to the group origin
    rotation: Vec3,                // local (radians)
    dimensions: Vec3,
    material: Material,
  }
  ```
- `SceneObjectSchema` gains optional `children?: GroupChild[]` (present/used only for `group`).
- Add `PrimitiveTypeSchema` (the subset children may use) and export `PRIMITIVE_TYPES`
  updated with the new primitives. Composed types are the rest.
- A schema refinement: if `type === "group"` then `children` must be a non-empty array;
  otherwise `children` should be absent. (Enforced via `.superRefine`.)

## Renderer (Spec 2 — components/preview)

- `primitives.tsx`: add `ConeMesh` (coneGeometry), `TorusMesh` (torusGeometry), `PrismMesh`
  (a 3-sided cylinder / extruded triangle via `cylinderGeometry` with radialSegments=3).
- `composed.tsx`: add part layouts for each seeded type (plant = pot cylinder + sphere/cone
  foliage; bookshelf = box frame + shelf slabs; sofa = base + back + arms; bed = base +
  mattress + pillow; rug = thin box; window = frame boxes; door = slab + knob; mug = cylinder
  + torus handle; bottle = cylinder + cone/cylinder neck; stool = seat + legs; streetlight =
  pole cylinder + arm + lamp sphere).
- `GroupView`: renders `object.children` as primitive meshes at their local transforms inside
  the group's transform.
- `SceneObjectView` dispatch (`RENDERERS`) gains all new types; `group` → GroupView.
- `mapping.ts`: `PRIMITIVE_TYPES` / `COMPOSED_TYPES` updated; add `coneArgs`, `torusArgs`,
  `prismArgs` pure helpers (unit-tested).

## Compiler (Spec 4 — blender/holyshift_addon/compiler.py)

- Add `_cone_bm`, `_torus_bm`, `_prism_bm` using verified bmesh ops:
  - cone: `bmesh.ops.create_cone(cap_ends=True, segments=32, radius1=r, radius2=0, depth=h)`.
  - torus: build via `create_uvsphere`-style is wrong; use a revolve — simplest reliable is
    `bmesh.ops.create_circle` + `spin`… but for MVP use a parametric torus built with
    `create_cone`? No. Use `create_uvsphere` is not a torus. Implement torus with a small
    manual bmesh (major/minor radii) OR approximate with `create_cone` ring. DECISION: build
    a proper torus via nested `create_circle` + `bridge_loops`/`spin`; if that proves fiddly,
    approximate visually with a flattened uvsphere ring. (Renderer uses true torusGeometry.)
  - prism: `create_cone(segments=3, radius1=r, radius2=r, depth=h)` = triangular prism.
- Seeded composed types: add their part layouts to `_composed_parts` mirroring the renderer.
- `group`: build an Empty parent, then one primitive object per child (using the child's
  own primitive builder + local transform + material), parented to the empty. Reuses the
  existing Y-up→Z-up conversion at the group level.
- `PRIMITIVES` / `COMPOSED` sets updated. Child primitive dispatch shares `_PRIMITIVE_BUILDERS`.

## AI (Spec 3 — lib/agent)

- `manifest.ts`: `CAPABILITIES` already derives object/light types from the schema, so new
  types flow automatically. Add a `primitiveTypes` list and a short `groupMechanism` note.
- `patch.ts`: `CreateObjectSchema` gains optional `children` (array of GroupChild-shaped
  create fields) so the AI can create a group in one op. `patchSchema.ts` (Groq JSON schema)
  mirrors it (nullable children array).
- `apply.ts`: when creating a `group`, pass `children` through to the factory.
- `prompt.ts`: teach the AI —
  - Prefer a seeded composed type when the request matches one.
  - Otherwise emit `{ type: "group", name: "<thing>", children: [ ...primitives... ] }`.
  - Children may only use primitive types; keep counts modest (a few parts).
  - Never request an unsupported type.

## Testing strategy

- schema: new primitives valid; group requires non-empty children; child with a composed
  type rejected; non-group with children rejected.
- factory: default object for every new type is schema-valid; group default has children.
- mapping/dispatch: `RENDERERS` covers every ObjectType (existing test auto-extends).
- apply: creating a group with children produces a valid object; children preserved.
- Blender conformance: add cases for each new primitive, a group (empty + N child meshes),
  and a couple of seeded composed types. Run on real Blender.
- Live smoke (if key): "add a potted plant" → expect a group or `plant` seeded type.

## Risks / mitigations
- Torus in bmesh is the fiddliest op. Mitigation: implement carefully and lean on the
  conformance test; if a true torus is unreliable, render a visually-close ring and keep the
  browser's real torusGeometry (browser is the fast-feedback view; Blender stays valid).
- Prompt bloat: the manifest description grows. Mitigation: list types compactly; give ONE
  worked `group` example, not many.
