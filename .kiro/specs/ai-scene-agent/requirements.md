# Requirements — AI Scene Agent + Iterative Editing

**Spec 3 of 7.** Blueprint Stages 4-5. Depends on Spec 1 (state) and Spec 2 (preview).

## Introduction

Make natural language capable of creating and modifying the structured world. The AI is
STATE-AWARE: it receives the current scene and the user's instruction, and returns a
validated, machine-readable PATCH describing changes (create / update / delete). The patch
is applied via the Spec 1 operations, so unaffected objects are preserved.

The AI never emits Blender code or free-form geometry. It emits only operations expressed
in terms of the CAPABILITY MANIFEST — the closed set of supported types, materials, and
lights. This keeps the AI, the preview, and the future Blender compiler in lockstep.

Provider: Groq, using structured outputs (response_format json_schema, strict mode on
supported models), with the API key held server-side behind a Next.js route.

## Requirements

### Requirement 1 — Capability manifest and output contract

**User story:** As the system, I want a single closed contract for what the AI may produce,
so that the AI can never request something the renderer/compiler cannot build.

#### Acceptance Criteria
1. THE system SHALL define a capability manifest: supported object types, material fields,
   and light types, derived from the Spec 1 schema.
2. THE AI output SHALL conform to a ScenePatch schema built from the manifest.
3. THE ScenePatch schema SHALL be expressible as a JSON Schema for Groq structured output.
4. WHEN the AI returns output THEN it SHALL be validated with Zod before use.

### Requirement 2 — Create / modify / delete via natural language

**User story:** As a user, I want to build and change the scene by describing it, so that I
do not hand-edit JSON.

#### Acceptance Criteria
1. WHEN the user asks to create objects THEN the agent SHALL return create operations.
2. WHEN the user asks to modify an object THEN the agent SHALL return update operations
   targeting the correct object (by id / type / ordinal).
3. WHEN the user asks to delete an object THEN the agent SHALL return a delete operation.
4. WHEN the user asks to change lighting/environment THEN the agent SHALL return the
   corresponding environment/light operations.
5. WHEN a patch is applied THEN objects not referenced SHALL remain unchanged.

### Requirement 3 — State-aware iterative editing

**User story:** As a user, I want the agent to remember the current world across turns, so
that sequential edits build on each other.

#### Acceptance Criteria
1. THE agent SHALL receive the current scene state with every request.
2. THE agent SHALL prefer incremental patches over regenerating the whole world.
3. Sequential commands (create desk → add chair → move chair → widen desk → add monitor →
   change lighting) SHALL preserve prior objects and modify only what was requested.

### Requirement 4 — Robustness and clarification

**User story:** As a user, I want clear behavior when the AI fails or my request is
ambiguous, so that the app stays reliable.

#### Acceptance Criteria
1. IF the AI returns malformed/invalid output THEN the system SHALL retry/repair once, then
   surface a clear error without corrupting state.
2. IF a reference cannot be resolved (e.g. "move it over there") THEN the agent SHALL
   return a clarification request instead of guessing.
3. IF the request targets an unsupported operation/type THEN the agent SHALL decline with a
   controlled message rather than inventing state.
4. THE API key SHALL never be exposed to the client.

### Requirement 5 — UI integration

**User story:** As a user, I want to type an instruction and see the scene change, so that
the loop feels conversational.

#### Acceptance Criteria
1. THE CommandBar SHALL send the prompt + current scene to /api/agent.
2. WHILE awaiting a response THE UI SHALL show a loading state.
3. WHEN a patch returns THEN it SHALL be applied to the store and reflected in the preview.
4. WHEN an error or clarification returns THEN it SHALL be shown to the user.

## Out of scope
- Voice (Spec 5), reference images (Spec 6), verification (Spec 7).
- Multi-agent routing (single Scene Agent for MVP per blueprint §22).
