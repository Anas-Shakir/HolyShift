# Requirements — Scene Vocabulary Expansion

**Spec 5 of 8.** New P1 spec (not in the original blueprint list, added to make "a good
scene" achievable). Depends on Specs 1-4. Must preserve the determinism principle.

## Introduction

Today the scene vocabulary is a small closed set (cube, sphere, cylinder, plane + a few
composed types). Anything else — "add a plant", "add a bookshelf" — is rejected. This
spec expands what scenes can contain WITHOUT breaking the core principle that the AI emits
structured intent over a known, deterministic compiler (never arbitrary geometry).

Two complementary moves:

1. **More base primitives** (cone, torus, prism/wedge) so richer shapes are expressible.
2. **A `group` object** whose children are primitives the AI composes freely. This lets the
   AI build NOVEL objects on the fly (a plant = pot cylinder + foliage sphere; a lamp post =
   cylinder + sphere) from known parts — creativity in composition, not in geometry.
3. **Seeded composed types**: a batch of common pre-built objects (plant, bookshelf, sofa,
   bed, rug, window, door, mug, bottle, shelf, stool, streetlight) so frequent asks "just
   work" and give the AI good examples to imitate with `group`.

The schema, the R3F renderer, the Blender `bpy.data` compiler, and the AI capability
manifest + prompt all move together (lockstep), so the AI can never request something the
renderer/compiler can't build.

## Requirements

### Requirement 1 — Additional primitives

**User story:** As the AI, I want more base shapes, so that I can compose a wider range of
recognizable objects.

#### Acceptance Criteria
1. THE schema SHALL add primitive types: `cone`, `torus`, `prism` (triangular wedge).
2. THE R3F renderer SHALL render each new primitive with transform + material.
3. THE Blender compiler SHALL build each new primitive via `bpy.data`/`bmesh` (no `bpy.ops`).

### Requirement 2 — Group composition

**User story:** As a user, I want to ask for objects that aren't pre-built (e.g. "a plant"),
and have the AI assemble them from primitives, so that scenes are not limited to a fixed list.

#### Acceptance Criteria
1. THE schema SHALL add a `group` object type with a `children` array; each child is a
   primitive with its own local transform + dimensions + material.
2. WHEN the AI cannot map a request to a seeded type THEN it MAY emit a `group` of primitives
   forming the requested object, with a descriptive name.
3. THE R3F renderer SHALL render a group as its child primitives positioned relative to the
   group origin, respecting the group's own transform.
4. THE Blender compiler SHALL render a group as an Empty parent with the child primitives
   parented to it.
5. Group children SHALL only use supported primitive types (validated).

### Requirement 3 — Seeded composed types

**User story:** As a user, I want common objects to appear correctly without the AI having to
compose them each time, so that frequent scenes are reliable and fast.

#### Acceptance Criteria
1. THE schema SHALL add seeded composed types: at minimum `plant`, `bookshelf`, `sofa`,
   `bed`, `rug`, `window`, `door`, `mug`, `bottle`, `stool`, `streetlight`.
2. Each seeded type SHALL render recognizably in both the browser and Blender from primitives.
3. Each seeded type SHALL respect transform, dimensions, and material.

### Requirement 4 — AI awareness (lockstep)

**User story:** As the system, I want the AI to know the full expanded vocabulary and the
group mechanism, so that it uses seeded types when they fit and groups otherwise.

#### Acceptance Criteria
1. THE capability manifest SHALL include all new primitive and composed types and the group
   mechanism, derived from the schema (no drift).
2. THE system prompt SHALL instruct the AI: prefer a seeded type when one matches; otherwise
   compose a `group` of primitives; never request an unsupported primitive.
3. THE AI output schema (ScenePatch) SHALL support creating groups with children.

### Requirement 5 — No regressions

#### Acceptance Criteria
1. All existing tests (web + Blender conformance) SHALL continue to pass, updated where the
   vocabulary changed.
2. The web build SHALL remain clean; the Blender conformance harness SHALL pass on real Blender.

## Out of scope
- Arbitrary AI-generated mesh topology (blueprint §10/§20 — remains excluded).
- Asset import / model libraries (separate future spec).
- Nested groups (a group inside a group) — children are primitives only for the MVP.
