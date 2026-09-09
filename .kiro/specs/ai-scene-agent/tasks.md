# Tasks — AI Scene Agent + Iterative Editing

**Spec 3 of 7.** TDD for pure logic (manifest, patch schema, apply). Route/Groq unit-tested
with mocked fetch; live call only when GROQ_API_KEY is present.

- [x] 1. Capability manifest + ScenePatch schema + JSON Schema
  - lib/agent/manifest.ts (types, material fields, light types from Spec 1 schema).
  - lib/agent/patch.ts (ScenePatch Zod discriminated union + Target).
  - lib/agent/patchSchema.ts (JSON Schema mirroring patch.ts for Groq strict output).
  - Tests: manifest matches schema; valid/invalid patches.
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Patch application engine
  - lib/agent/apply.ts: applyPatch(scene, patch) → { scene, applied[], errors[] }, pure.
  - Uses operations.ts + resolve.ts; preserves unaffected objects; collects per-op errors.
  - Tests: create/update/delete/env/light; ordinal targeting; preserve-others; clarification.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3_

- [x] 3. Groq client + /api/agent route
  - lib/agent/prompt.ts (system prompt: manifest + rules + current scene).
  - lib/agent/groq.ts (server-only requestPatch: fetch + response_format json_schema strict + repair retry; normalizePatch).
  - app/api/agent/route.ts (POST { prompt, scene } → patch | error; key server-side).
  - Tests: normalizePatch; request/repair logic with mocked fetch.
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4_

- [x] 4. CommandBar wiring + states + verification
  - store applyAgentPatch action; CommandBar → /api/agent → apply → preview.
  - Loading / error / clarification UI.
  - Full suite + build.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Status

**Spec 3 complete (pending live-key smoke test).** 103 tests passing across 14 files;
`npm run build` clean with /api/agent as a dynamic serverless function. The live AI
round-trip requires a Groq API key:

1. Create `.env.local` with `GROQ_API_KEY=your_key` (optionally `GROQ_MODEL=openai/gpt-oss-20b`).
2. `npm run dev`, then in the command bar try:
   "Create a desk with two monitors and a chair", then "make the desk wider",
   then "make the lighting purple", then "remove the second monitor".

Model note: strict structured output is supported on models like `openai/gpt-oss-20b` and
`openai/gpt-oss-120b`. Ready for Spec 4 (Blender Synchronization).
