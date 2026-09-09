# Design — AI Scene Agent + Iterative Editing

**Spec 3 of 7.** Turns natural language into validated ScenePatches applied to Spec 1 state.

## Overview

The agent is a single Scene Agent (per blueprint §22): one Groq call per user turn. It
receives the current scene + the instruction and returns a ScenePatch — a list of typed
operations. The patch is validated (Zod) and applied via Spec 1 operations, preserving the
rest of the world.

Key discipline: the AI's output schema is DERIVED from the capability manifest, which is
itself derived from the Spec 1 schema. The AI therefore cannot express anything the
renderer (Spec 2) or Blender compiler (Spec 4) can't build.

## Architecture

```text
lib/agent/
  manifest.ts        → capability manifest (types, material fields, light types) from schema
  patch.ts           → ScenePatch Zod schema (create/update/delete/setEnvironment/add|removeLight/clarify)
  patchSchema.ts     → JSON Schema for Groq structured output (mirrors patch.ts)
  apply.ts           → applyPatch(scene, patch) → { scene, applied[], errors[] }  (pure)
  prompt.ts          → buildSystemPrompt(scene) + manifest description + rules
  groq.ts            → server-only Groq client (requestPatch) using fetch + response_format
app/api/agent/route.ts → POST { prompt, scene } → { patch } | { clarification } | { error }
components/CommandBar.tsx → sends request, applies patch via store, loading/error/clarify UI
store/sceneStore.ts   → add applyAgentPatch(patch) action (wraps apply.ts)
```

## Data model: ScenePatch

```text
ScenePatch = {
  operations: Operation[],
  clarification?: string   // set when the agent needs the user to disambiguate
}

Operation (discriminated union on "op"):
  { op: "create", object: { type, name?, position?, rotation?, scale?, dimensions?, material? } }
  { op: "update", target: Target, changes: { name?, position?, rotation?, scale?, dimensions?, material? } }
  { op: "delete", target: Target }
  { op: "setEnvironment", changes: { backgroundColor?, ambientIntensity? } }
  { op: "addLight", light: { type, color, intensity, position } }
  { op: "removeLight", id: string }

Target = { id: string } | { type: ObjectType, ordinal?: number }
```

Create ops carry partial object fields; ids are assigned by the factory on apply (the AI
does not invent ids for new objects). Update/delete resolve targets against the current
scene by id, or by type + optional ordinal ("second monitor").

## Groq integration (server-only)

- Model: a strict-structured-output capable model (e.g. `openai/gpt-oss-20b` /
  `openai/gpt-oss-120b`). Configurable via env `GROQ_MODEL` (default set in code).
- Request: chat completion with `response_format: { type: "json_schema", json_schema: {
  name, strict: true, schema } }`, system prompt = manifest + rules + current scene JSON,
  user message = the instruction.
- Validation: parse JSON → Zod `ScenePatchSchema.safeParse`. On failure, retry ONCE with a
  repair note appended; on second failure, return a structured error.
- Key: read `process.env.GROQ_API_KEY` in the route (server). Never sent to client.

## Applying patches (pure, tested)

`applyPatch(scene, patch)`:
- Iterates operations in order, applying each via Spec 1 `operations.ts` + `resolve.ts`.
- Create → `addObject(type, overrides)`; Update → resolve target then `updateObject`;
  Delete → resolve target then `removeObject`; environment/lights via their ops.
- Collects `applied` (human-readable) and `errors` (per-op) without throwing; a failed op
  does not abort the others, and the scene is re-validated after each successful op.
- If `patch.clarification` is present and there are no operations, returns the scene
  unchanged and signals a clarification to the UI.

## UI integration

- CommandBar: textarea + Send. On submit → POST `/api/agent` with `{ prompt, scene }`.
- Store gains `applyAgentPatch(patch)` → runs `applyPatch`, sets error on failure, keeps
  last-good scene. Loading state via local component state; clarification shown inline.

## Testing strategy

- manifest.ts: covers every schema type/light; stays in sync with Spec 1 (assert equality).
- patch.ts: valid/invalid patches; discriminated union correctness.
- apply.ts: create/update/delete/env/light; preserve-others; ordinal targeting; per-op
  error collection; clarification passthrough. This is the bulk of the value and needs no key.
- route.ts / groq.ts: unit-test request/repair logic with a mocked fetch (no network). A
  live smoke test runs only if GROQ_API_KEY is present (skipped otherwise).

## Error handling
- Invalid AI output → one repair retry → structured error to UI; state untouched.
- Unresolved reference → clarification (no mutation).
- Missing key → route returns a 500 with a clear "AI not configured" message; UI shows it.
