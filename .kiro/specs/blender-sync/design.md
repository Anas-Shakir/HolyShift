# Design — Blender Synchronization

**Spec 4 of 7.** Relay + Blender add-on + deterministic bpy.data compiler. Blender 4.2 LTS.

## Overview

The deployed web app and the user's local Blender each open an OUTBOUND WebSocket to a
small always-on relay. The relay pairs them by code and forwards messages. On "Sync to
Blender", the web app sends the full scene; the Blender add-on receives it on a background
thread, hands it to the main thread via `bpy.app.timers`, and a deterministic `bpy.data`
compiler rebuilds the scene. A structured result flows back to the web app.

```text
Web (Vercel)  ──WS──▶  Relay (Render, Node+ws)  ◀──WS──  Blender add-on (local)
   scene state            pairs by code, forwards         bg thread → queue →
   Sync button            no scene logic                  timer (main) → compiler(bpy.data)
```

## Protocol (shared contract)

JSON messages (`type` discriminator):
- `hello`: `{ type:"hello", role:"web"|"blender", code:string }`
- `paired`: `{ type:"paired", role }` — sent to each member when a session forms.
- `peer_left`: `{ type:"peer_left" }` — the other member disconnected.
- `sync`: `{ type:"sync", scene: Scene }` — web → blender (full scene).
- `sync_result`: `{ type:"sync_result", ok:boolean, summary?:string, error?:string }` — blender → web.
- `error`: `{ type:"error", message:string }`.
- `ping` / `pong`: keep-alive.

The web side validates messages with Zod (`lib/sync/protocol.ts`). The relay treats bodies
opaquely except for `hello` (to pair) and passthrough. The add-on parses JSON directly.

## Relay (relay/, Node + ws) — deploys to Render

- Single `ws` server. On `hello`, register the socket under its code + role.
- When both roles for a code are present, send `paired` to each; mark a session.
- Forward any non-`hello` message from one member to the other.
- On close: notify peer with `peer_left`, clean up the code entry.
- Heartbeat: periodic `ping`; terminate sockets that stop responding.
- Stateless beyond the in-memory code→sockets map. No scene storage.
- Free-tier note: Render may sleep on inactivity; the web client shows a "connecting…"
  state and retries; a keep-alive ping reduces idle sleeps while a session is active.

## Compiler (blender/holyshift_addon/compiler.py) — bpy.data, Blender 4.2

Reliability principle: `bpy.data` + `bmesh` construction, never `bpy.ops` (context-free,
deterministic). Verified 4.x signatures:
- `bmesh.ops.create_cube(bm, size, matrix)`, `create_uvsphere(bm, u_segments, v_segments,
  radius, matrix)`, `create_cone(...)` for cylinder (equal radii), `create_grid(...)`/thin
  cube for plane. Non-uniform dimensions via `mathutils.Matrix` scale in the op matrix, or
  by writing the bmesh to a mesh and setting `obj.scale`/`obj.dimensions`.
- Object: `mesh = bpy.data.meshes.new(name)`; `bm.to_mesh(mesh)`; `obj =
  bpy.data.objects.new(name, mesh)`; `collection.objects.link(obj)`.
- Composed types: build a parent `Empty` object + child primitive objects parented to it,
  mirroring the web renderer's part layout so preview and Blender agree.
- Transform: `obj.location`, `obj.rotation_euler`, `obj.scale`; base `dimensions` baked into
  geometry.
- Material: `mat = bpy.data.materials.new(name)`; `mat.use_nodes=True`; set Principled BSDF
  Base Color / Metallic / Roughness / Alpha / Emission; fallback to `mat.diffuse_color`.
- Light: `ld = bpy.data.lights.new(name, type)`; set color/energy; object + link.
- Camera: `cd = bpy.data.cameras.new(name)`; set lens/fov; object + link; aim via
  `rotation_euler` from position→target.
- Environment: `scene.world` node background color + strength from ambientIntensity.
- Tag every created datablock/object with a custom property `holyshift_id = <scene id>` so
  update/delete can find and replace by id. A full `sync` clears prior holyshift objects and
  rebuilds (simplest reliable behavior for MVP), or diffs by id (optimization later).
- `compile_scene(scene_dict) -> { ok, summary/counts } | { ok:false, error }`.

## Add-on (blender/holyshift_addon/) — threading

- `bl_info` targets Blender 4.2. Package: `__init__.py`, `client.py`, `compiler.py`,
  `panel.py`.
- `client.py`: `websocket-client` `WebSocketApp.run_forever()` on a `threading.Thread`
  (it blocks). Incoming messages → `queue.Queue`.
- Main-thread drain: `bpy.app.timers.register(drain, persistent=True)` pops the queue and,
  for `sync`, runs `compile_scene`, then sends `sync_result` back through the socket.
- `panel.py`: N-panel with pairing-code text field (add-on preferences or scene prop),
  Connect/Disconnect operators, status label.
- Because Blender's bundled Python may lack `websocket-client`, the add-on attempts import
  and, if missing, shows an install hint; a vendored single-file fallback is acceptable.

## Web side (lib/sync + components)

- `lib/sync/protocol.ts`: Zod message schemas + type guards (shared shape with relay/add-on).
- `lib/sync/useBlenderSync.ts`: a hook managing the relay WebSocket, pairing code, connection
  status (`disconnected|connecting|waiting_for_blender|paired|error`), and `sync(scene)`
  returning a promise that resolves on `sync_result`.
- `components/BlenderConnect.tsx`: shows/edits the pairing code, connection status.
- CommandBar "Sync to Blender" button becomes enabled when paired; shows sync status.
- Relay URL from `NEXT_PUBLIC_RELAY_URL`; if unset, the UI shows "Blender sync not configured".

## Testing strategy

- Web: protocol Zod schemas (valid/invalid); `useBlenderSync` state machine with a mocked
  WebSocket (connect → paired → sync → sync_result → error paths).
- Relay: pairing + forwarding + peer_left with an in-process ws client (Node test).
- Compiler/add-on: headless-Blender conformance harness (`blender --background --python`)
  asserting bpy.data results per entity. Runnable where Blender is installed; documented so
  it can run in CI or locally. (This environment may not have Blender; the harness + a dry
  self-check that imports cleanly are provided, and the script is verified for syntax.)

## Error handling
- Relay down / sleeping: web shows connecting/retry; never blocks the browser scene.
- Blender unavailable: Sync shows "no Blender paired"; scene preserved.
- Compile failure: add-on returns `sync_result{ok:false,error}`; web shows it; scene preserved.
- Missing websocket-client in Blender: panel shows an install hint.
