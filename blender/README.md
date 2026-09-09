# HolyShift Blender Integration

Blender 4.2 LTS. Two parts:

- `holyshift_addon/` — the installable add-on: a WebSocket client that connects outbound to
  the relay, receives scenes, and rebuilds them with the deterministic `bpy.data` compiler.
- `tests/conformance.py` — headless conformance tests for the compiler.

## Deterministic compiler

`holyshift_addon/compiler.py` reproduces a HolyShift scene in Blender using `bpy.data` and
`bmesh` — never `bpy.ops`. Operators depend on UI context and are unreliable when scripted;
the data API is context-free and deterministic. Every object HolyShift makes is tagged with
a `holyshift_id` custom property so a resync replaces exactly what it created without
touching the user's own objects.

## Run the conformance tests (tester in the loop)

Requires a local Blender 4.2 install. From the repo root:

```bash
blender --background --python blender/tests/conformance.py
```

Expected tail on success:

```
CONFORMANCE PASSED
```

Exit code 0 = pass, non-zero = a failing check (message on stderr). The harness builds each
supported entity (primitives, composed objects, materials, lights, camera, environment) and
asserts the resulting `bpy.data` objects have the expected type/structure, and that a resync
replaces rather than duplicates.

> Note: this repo's CI/dev environment may not have Blender installed, so the tests are run
> where Blender is available (a developer machine or a Blender-provisioned CI job). The
> compiler module itself imports cleanly without Blender (it guards the `bpy` import), which
> lets linters and syntax checks run anywhere.

## Install the add-on

See `holyshift_addon/README.md`.
