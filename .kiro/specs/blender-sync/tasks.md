# Tasks — Blender Synchronization

**Spec 4 of 7.** Three targets: web (Vercel), relay (Render), Blender add-on. Blender 4.2 LTS.
bpy.data over bpy.ops. Headless conformance tests are a first-class deliverable.

- [x] 0. Pin Blender 4.2 LTS; verify bpy.data/bmesh API signatures (design).

- [x] 1. Shared sync protocol + web-side Zod
  - lib/sync/protocol.ts: hello/paired/peer_left/sync/sync_result/error/ping/pong; parse/serialize; codes.
  - Tests: valid/invalid message parsing (9).
  - _Requirements: 1.1, 1.2_

- [x] 2. Relay (Node + ws) for Render
  - relay/: ws server, pair by code, forward, heartbeat, peer_left, cleanup; package.json + README.
  - Test: in-process pairing + forwarding + peer_left (4).
  - _Requirements: 2.1–2.6_

- [x] 3. Deterministic bpy.data compiler (Blender 4.2)
  - blender/holyshift_addon/compiler.py: primitives (bmesh), composed (empty + parts),
    transforms, dimensions, materials, lights, camera, environment; holyshift_id tagging; full rebuild.
  - _Requirements: 3.1–3.6_

- [x] 4. Headless-Blender conformance harness
  - blender/tests/conformance.py: build each entity, assert bpy.data results. Ran on real
    Blender → PASSED (44 checks); caught & fixed a resync-duplication bug.
  - _Requirements: 4.1, 4.2_

- [x] 5. Blender add-on (threading + panel)
  - __init__.py (bl_info 4.2), client.py (bg-thread WS → queue), connection.py (main-thread
    timer drain + compiler + sync_result), panel.py (pairing code + Connect + status). README.
  - Verified register/unregister on real Blender (addon_register.py).
  - _Requirements: 5.1–5.4_

- [x] 6. Web sync UI + verification
  - lib/sync/useBlenderSync.ts hook; BlenderSyncProvider + BlenderConnect; wired Sync-to-Blender.
  - Connection + sync status; unconfigured/unavailable/failure handling preserving state.
  - Tests (mocked WebSocket, 3) + full suite (115) + build.
  - _Requirements: 6.1–6.4_

## Status

**Spec 4 complete (pending live end-to-end round-trip).** 115 web tests across 16 files;
relay 4/4; Blender conformance 44/44 + add-on register check — all on real Blender. Build
clean; `/api/agent` dynamic, sync UI present. Completes the P0 MVP pipeline.

### Remaining manual/live steps (need external services)
1. Deploy the relay to Render (see relay/README.md); set `NEXT_PUBLIC_RELAY_URL` in the web
   app env (`.env.local` locally, Vercel env in prod) to the `wss://…onrender.com` URL.
2. Install the Blender add-on (zip blender/holyshift_addon) and `pip install websocket-client`
   into Blender's Python.
3. In the web app click "Connect Blender", paste the code into Blender, Connect, then
   "Sync to Blender" and confirm the scene appears. (Not runnable in this dev environment.)
