# Tasks — Scene Vocabulary Expansion

**Spec 5 of 8.** Lockstep changes across schema → renderer → compiler → AI. TDD; run the
Blender conformance harness on real Blender.

- [x] 1. Extend schema
  - Add primitives cone/torus/prism; group type; seeded composed types.
  - GroupChildSchema; SceneObject.children?; PrimitiveTypeSchema; superRefine (group⇔children).
  - Update OBJECT_TYPES/PRIMITIVE_TYPES exports.
  - Tests: new types valid; group requires children; child composed-type rejected.
  - _Requirements: 1.1, 2.1, 2.5, 3.1_

- [x] 2. Factory + defaults
  - TYPE_DEFAULTS for new primitives + seeded composed; createDefaultObject handles group children.
  - Tests: every type produces a schema-valid default; group default has children.
  - _Requirements: 1.1, 3.1, 3.3_

- [x] 3. R3F renderer
  - primitives.tsx: cone/torus/prism; mapping.ts helpers (coneArgs/torusArgs/prismArgs).
  - composed.tsx: seeded types; GroupView for children; RENDERERS dispatch covers all.
  - Tests: mapping helpers; dispatch covers every type.
  - _Requirements: 1.2, 2.3, 3.2_

- [x] 4. Compiler + AI (lockstep)
  - compiler.py: _cone_bm/_torus_bm/_prism_bm; seeded composed part layouts; group = empty +
    child primitive objects parented.
  - manifest.ts primitive list + group note; patch.ts/patchSchema.ts children; apply.ts group;
    prompt.ts group guidance + seeded preference.
  - Conformance: add primitive/group/seeded cases; run on real Blender.
  - _Requirements: 1.3, 2.2, 2.4, 4.1, 4.2, 4.3_

- [x] 5. End-to-end verification
  - Full vitest suite (126 pass); npm run build clean; Blender conformance PASSED on real
    Blender (primitives + group + 11 seeded types); live agent smoke test.
  - _Requirements: 5.1, 5.2_

## Status

**Spec 5 complete.** Web: 126 tests / 16 files; build clean. Blender: conformance harness
PASSED on real Blender (cone/torus/prism, group empty+children, all seeded composed).
Live: the deployed-style agent now composes NOVEL objects — "add a potted plant and a
mailbox" returned two `group` objects built from primitives (pot cylinder + foliage sphere;
post + red box). Determinism preserved: the AI composes known primitives, the compiler only
ever draws known parts.

### Note on Groq output mode
The expanded patch schema (nested anyOf + children arrays) exceeded Groq strict
`json_schema` constrained decoding (`json_validate_failed`). Switched to JSON Object Mode
(`response_format: {type:"json_object"}`) with the output shape described in the prompt, plus
Zod validation + normalizePatch + a repair retry. This is the robust path for a large
output contract and is verified live.

### To pick up in production
Redeploy the web app (Vercel) and reinstall the Blender add-on to get the new vocabulary +
compiler. The relay is unchanged.
