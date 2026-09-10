# Design — Scene Verification & Self-Correction

**Spec 7 of 8.** Pre-sync, web-preview verification with deterministic geometric checks
(primary) + optional vision tier.

## Why pre-sync / web-preview (vs. blueprint's Blender post-sync)

The blueprint proposed verifying Blender's render after sync. We verify the WEB state before
sync instead, because:
- The correction belongs in the source of truth (web state); Blender derives from it.
- Web-state checks are instant and free (no Blender round-trip / render).
- Verification becomes part of the core loop, usable even before Blender is connected.
- Cleaner story: "AI builds → checks its work → fixes → you commit."

Deterministic geometric checks answer most placement questions directly from the structured
state (positions, dimensions, scale) — no image or model needed. The vision tier adds
semantic judgment on top and is optional.

## Bounding boxes and the "up" axis

The web scene is Y-up. For an object with `dimensions [w,h,d]`, `transform.position` is its
CENTER (that's how SceneObjectView places the group), and `scale` multiplies dimensions.
So the world AABB half-extents are `[w*sx/2, h*sy/2, d*sz/2]` and:
- `base_y = position.y - h*sy/2`  (bottom of the object)
- `top_y  = position.y + h*sy/2`
Rotation is ignored for the AABB (axis-aligned approximation — good enough for these checks;
documented as a known simplification).

## Module layout

```text
lib/verify/
  boxes.ts       → aabb(object): { min:[x,y,z], max:[...], center, halfExtents }; overlap(a,b)
  geometry.ts    → verifyGeometry(scene): Issue[]   (pure, the primary tier)
  fixes.ts       → applyFix(scene, issue) / applyFixes(scene, issues): Scene (via operations)
  types.ts       → Issue, Severity, Fix
store/sceneStore → verifyScene() sets `issues`; applyFix/applyFixAll wrap fixes.ts
components/
  VerifyPanel.tsx → "Verify scene" button, issue list, Fix / Fix all, clean state
app/api/verify   → (stretch) vision-tier route
```

## Issue model (lib/verify/types.ts)

```
Severity = "error" | "warning"
Issue = {
  key: string,              // stable, e.g. "floating:chair_01"
  severity: Severity,
  kind: "floating" | "below_floor" | "interpenetration" | "out_of_bounds" | "bad_scale" | "missing" | "semantic",
  message: string,
  objectIds: string[],      // targets (for selection + fix)
  fix?: { objectId: string, patch: TransformOrMaterialPatch },  // an updateObject patch; absent = manual
}
```

## Geometric checks (lib/verify/geometry.ts)

Constants: `FLOOR_Y = 0`, `SCENE_EXTENT = 50` (|x|,|z| beyond → out of bounds; y beyond too),
`FLOAT_TOLERANCE = 0.02`, `OVERLAP_TOLERANCE = 0.02`, `MAX_SCALE = 100`.

- **below_floor**: `base_y < FLOOR_Y - tol` → fix: raise so base sits on floor
  (`position.y += (FLOOR_Y - base_y)`), i.e. drop-to-floor.
- **floating**: `base_y > FLOOR_Y + tol` AND no supporting object beneath it (no other object
  whose top is near this base and whose x/z footprint overlaps). Fix: drop to the nearest
  support top, else to the floor. (Planes/rugs and very flat objects are treated as floor-like
  and exempt as "floating".)
- **interpenetration**: for each pair (excluding group-vs-its-own-children — groups are single
  objects here so N/A), AABBs overlap on all 3 axes beyond tolerance → warning. Fix: nudge the
  later object along the axis of least penetration to just clear. (Applied only if
  unambiguous; otherwise report only.)
- **out_of_bounds**: any |center axis| + halfExtent > SCENE_EXTENT → fix: none (report; likely
  intentional or needs user).
- **bad_scale**: any scale <= 0 or > MAX_SCALE, or any effective dimension <= 0 → fix: reset
  offending scale component to 1.

Expected-object presence ("missing") requires an intent, which the geometric tier does not
have; it is produced by the vision/AI tier (or a future intent-aware check), so tier 1 omits it.

## Fix application (lib/verify/fixes.ts)

- `applyFix(scene, issue)`: if `issue.fix`, call `updateObject(scene, fix.objectId, fix.patch)`
  and return the new scene; else return unchanged.
- `applyFixes(scene, issues)`: fold applyFix over fixable issues (recompute is not needed;
  fixes are independent transform tweaks). Each application is Zod-validated by updateObject.

## Store wiring

- `issues: Issue[]`, `verifyScene()` → runs `verifyGeometry(scene)` (+ merges any vision
  issues later), sets `issues`. `applyFix(key)` / `applyFixAll()` apply via fixes.ts and
  re-run verifyGeometry to refresh the list.

## UI (components/VerifyPanel.tsx)

- Lives in the left sidebar (Scene panel) or a small section: a "Verify scene" button, then a
  list of issues (severity dot, message, "Fix" when fixable). A "Fix all" button. Clean state
  ("No issues found") when empty. Clicking an issue selects its target object (Spec 6).

## Vision tier (stretch, app/api/verify)

- Client captures the R3F canvas via `gl.domElement.toDataURL("image/png")` (drei
  `useThree().gl`), posts `{ image, intent, sceneSummary }` to `/api/verify`.
- Route calls a Groq vision-capable model (server-side key), prompts for semantic placement
  issues, returns `Issue[]` (kind "semantic", advisory; fixes optional/AI-suggested).
- Gated: if no vision model configured, the button/section is hidden; tier 1 unaffected.

## Testing strategy

- boxes.ts: aabb math (center/halfExtents with scale), overlap true/false with tolerance.
- geometry.ts: each check with crafted scenes (a floating chair, an object below floor, two
  overlapping cubes, out-of-bounds, zero scale); assert issue kind + fix patch.
- fixes.ts: applying a drop-to-floor fix sets base to floor; fix-all resolves multiple;
  unrelated objects untouched.
- store: verifyScene populates issues; applyFixAll clears the fixable ones.
- VerifyPanel: renders issues, Fix/Fix-all call store, clean state.
- Vision tier: route unit-tested with mocked fetch; live only if configured.

## Edge cases
- Empty scene → no issues.
- A single floor plane → not flagged as floating (flat/floor-like exemption).
- Fixes must never produce an invalid scene (updateObject Zod-validates; a fix that would be
  invalid is skipped).
