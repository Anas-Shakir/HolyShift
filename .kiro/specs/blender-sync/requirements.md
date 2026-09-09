# Requirements — Blender Synchronization

**Spec 4 of 7.** Blueprint Stages 6-7. Depends on Specs 1-3. Completes the P0 MVP.

## Introduction

Deterministically reproduce the browser-authoritative scene state in the user's local
Blender. Because the web app is deployed (public) and Blender runs privately on the user's
machine, both sides connect OUTBOUND to an always-on relay, matched by a pairing code. The
Blender add-on compiles the received scene into real Blender objects using the `bpy.data`
API (not `bpy.ops`) for reliability against Blender's strict reader.

Pinned target: **Blender 4.2 LTS**.

## Requirements

### Requirement 1 — Sync protocol

**User story:** As the system, I want one message contract shared by web, relay, and
Blender, so that the three parts interoperate reliably.

#### Acceptance Criteria
1. THE protocol SHALL define messages: `hello` (role + pairing code), `paired`, `sync`
   (full scene), `sync_result` (ok + summary or error), `error`, and `ping`/`pong`.
2. THE web side SHALL validate protocol messages with Zod.
3. THE relay SHALL forward `sync`/`sync_result` between the paired web and Blender sockets
   without interpreting scene contents.

### Requirement 2 — Relay

**User story:** As a user on a deployed site, I want to connect my local Blender without
firewall/localhost issues, so that sync just works.

#### Acceptance Criteria
1. THE relay SHALL accept outbound WebSocket connections from both the web app and Blender.
2. THE relay SHALL match a web client and a Blender client by pairing code into one session.
3. THE relay SHALL forward messages between the two members of a session.
4. THE relay SHALL hold no scene logic and no persistent scene state.
5. THE relay SHALL handle heartbeat/keep-alive and clean up on disconnect.
6. THE relay SHALL run on a free tier (Render), Node.js + `ws`.

### Requirement 3 — Deterministic compiler (bpy.data)

**User story:** As a user, I want my scene reproduced faithfully in Blender, so that the
preview and Blender agree.

#### Acceptance Criteria
1. THE compiler SHALL build each supported object type using `bpy.data`/`bmesh`, never
   `bpy.ops`.
2. THE compiler SHALL apply transform (position, rotation, scale), dimensions, and material.
3. THE compiler SHALL create scene lights, camera, and environment/world settings.
4. THE compiler SHALL support create / update / delete keyed by object id.
5. THE compiler SHALL return a structured result (created/updated/deleted counts or error).
6. THE compiler SHALL target the Blender 4.2 `bpy.data` API.

### Requirement 4 — Conformance tests

**User story:** As a developer, I want automated confidence that the compiler produces what
Blender accepts, so that failures surface at build time, not demo time.

#### Acceptance Criteria
1. A headless-Blender harness SHALL run the compiler via `blender --background --python`.
2. FOR each supported entity, the harness SHALL assert the resulting `bpy.data` objects
   have the expected type/properties.

### Requirement 5 — Blender add-on

**User story:** As a user, I want to connect Blender to the site by pasting a code, so that
I do not touch a terminal.

#### Acceptance Criteria
1. THE add-on SHALL run a WebSocket client on a BACKGROUND thread (run_forever blocks).
2. THE add-on SHALL push received messages to a thread-safe queue and apply them on the
   MAIN thread via `bpy.app.timers` (bpy is not thread-safe).
3. THE add-on SHALL provide a sidebar panel with a pairing-code field, Connect button, and
   connection/sync status.
4. THE add-on SHALL be installable via Blender Preferences → Add-ons.

### Requirement 6 — Web sync UI

**User story:** As a user, I want to click "Sync to Blender" and see status, so that I know
what happened.

#### Acceptance Criteria
1. THE web app SHALL connect to the relay and show a pairing code / connection status.
2. WHEN the user clicks "Sync to Blender" THEN the current scene SHALL be sent over the relay.
3. THE web app SHALL show sync status (in progress / success / failure).
4. IF Blender is unavailable or execution fails THEN a clear message SHALL show and the
   browser scene SHALL be preserved.

## Out of scope
- Visual verification (Spec 7). Two-way editing (Blender → web) beyond status.
