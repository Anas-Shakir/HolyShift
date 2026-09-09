# HolyShift Sync — Blender Add-on

Connects Blender to the HolyShift web app (via the relay) and rebuilds scenes you send from
the browser. Target: **Blender 4.2 LTS** (works on newer 4.x/5.x too; the compiler uses only
stable `bpy.data`/`bmesh` APIs).

## Install

1. Zip the `holyshift_addon` folder (so the zip contains `holyshift_addon/__init__.py`, etc.).
2. Blender → Edit → Preferences → Add-ons → Install… → pick the zip → enable "HolyShift Sync".
3. Open the 3D viewport sidebar (press `N`) → **HolyShift** tab.

## Dependency: websocket-client

The add-on uses the `websocket-client` package. Blender's bundled Python usually needs it
installed once:

```bash
# From Blender's Python (path varies by OS/version):
"<blender>/4.2/python/bin/python" -m pip install websocket-client
```

If it is missing, the panel status shows "websocket-client not installed".

## Use

1. In the web app, connect and note the 4-character pairing code.
2. In the HolyShift panel, set the Relay URL (e.g. `wss://holyshift-relay.onrender.com`) and
   the pairing code, then click **Connect**. Status becomes "paired" once the web app is also
   connected with the same code.
3. Click **Sync to Blender** in the web app. The scene appears in Blender; the panel shows a
   result summary. Re-syncing replaces the previously generated objects (it never duplicates).

## How it works (threading)

`websocket-client`'s `run_forever()` blocks, so it runs on a background thread. Because `bpy`
is not thread-safe, incoming messages are placed on a queue; a `bpy.app.timers` callback
drains that queue on Blender's main thread, runs the deterministic compiler, and sends the
result back. This keeps all scene mutation on the main thread — the supported, safe pattern.
