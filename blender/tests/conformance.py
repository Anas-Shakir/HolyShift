"""
Headless-Blender conformance tests for the HolyShift compiler.

Runs the compiler inside a real (headless) Blender and asserts that the resulting bpy.data
objects have the expected type/structure/properties for every supported entity. This is the
"tester in the loop": it catches "what Blender actually accepts" failures at build time
rather than during a live demo.

Run:
    blender --background --python blender/tests/conformance.py

Exit code 0 = all checks passed; non-zero = a failure (message printed to stderr).
The script adds the add-on folder to sys.path so it can import the compiler directly.
"""

import os
import sys

# Make the compiler importable when run via `blender --python`.
_HERE = os.path.dirname(os.path.abspath(__file__))
_ADDON = os.path.normpath(os.path.join(_HERE, "..", "holyshift_addon"))
if _ADDON not in sys.path:
    sys.path.insert(0, _ADDON)

import bpy  # noqa: E402
import compiler  # noqa: E402


FAILURES = []


def check(condition, message):
    if condition:
        print("  ok:", message)
    else:
        print("  FAIL:", message, file=sys.stderr)
        FAILURES.append(message)


def reset_blend():
    """Start from an empty .blend for each case."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def objects_by_tag(hid):
    return [o for o in bpy.data.objects if compiler.TAG in o and o[compiler.TAG] == hid]


def base_object(obj_type, hid, dims=(1, 1, 1), material=None):
    return {
        "id": hid,
        "type": obj_type,
        "name": hid,
        "transform": {"position": [1, 2, 3], "rotation": [0, 0, 0], "scale": [1, 1, 1]},
        "dimensions": list(dims),
        "material": material
        or {"color": "#ff8800", "metalness": 0.3, "roughness": 0.4, "opacity": 1, "emissiveIntensity": 0},
    }


def scene_with(objects=None, lights=None):
    return {
        "metadata": {"version": 1, "name": "conf", "createdAt": "2026-01-01T00:00:00Z"},
        "objects": objects or [],
        "lights": lights or [],
        "camera": {"position": [6, 5, 6], "target": [0, 0, 0], "fov": 50},
        "environment": {"backgroundColor": "#101018", "ambientIntensity": 0.4},
    }


def test_primitives():
    print("test_primitives")
    for t in ["cube", "sphere", "cylinder", "plane"]:
        reset_blend()
        result = compiler.compile_scene(scene_with([base_object(t, t + "_01")]))
        check(result["ok"], "%s compiled ok (%s)" % (t, result))
        objs = objects_by_tag(t + "_01")
        check(len(objs) == 1, "%s created exactly one object" % t)
        if objs:
            obj = objs[0]
            check(obj.type == "MESH", "%s is a MESH" % t)
            check(len(obj.data.vertices) > 0, "%s has geometry" % t)
            check(tuple(round(v, 3) for v in obj.location) == (1.0, 2.0, 3.0),
                  "%s transform applied" % t)
            check(len(obj.data.materials) == 1, "%s has a material" % t)


def test_composed():
    print("test_composed")
    for t in ["chair", "desk", "table", "monitor", "pc", "lamp"]:
        reset_blend()
        result = compiler.compile_scene(scene_with([base_object(t, t + "_01", dims=(1, 1, 1))]))
        check(result["ok"], "%s compiled ok (%s)" % (t, result))
        tagged = objects_by_tag(t + "_01")
        check(len(tagged) >= 1, "%s created at least one object" % t)
        parents = [o for o in tagged if o.type == "EMPTY"]
        check(len(parents) == 1, "%s has one empty parent" % t)
        parts = [o for o in tagged if o.type == "MESH"]
        check(len(parts) >= 1, "%s has child part meshes" % t)
        if parents and parts:
            check(all(p.parent == parents[0] for p in parts),
                  "%s parts are parented to the empty" % t)


def test_material_emissive_and_alpha():
    print("test_material_emissive_and_alpha")
    reset_blend()
    mat = {"color": "#00ff00", "metalness": 1, "roughness": 0.1, "opacity": 0.5, "emissiveIntensity": 3}
    compiler.compile_scene(scene_with([base_object("cube", "cube_01", material=mat)]))
    objs = objects_by_tag("cube_01")
    check(bool(objs) and len(objs[0].data.materials) == 1, "emissive/alpha material assigned")


def test_lights_camera_environment():
    print("test_lights_camera_environment")
    reset_blend()
    scene = scene_with(
        objects=[base_object("cube", "cube_01")],
        lights=[{"id": "light_01", "type": "point", "color": "#ffffff", "intensity": 2, "position": [0, 3, 0]}],
    )
    result = compiler.compile_scene(scene)
    check(result["ok"], "scene with light/camera/env compiled ok")
    light_objs = objects_by_tag("light_01")
    check(len(light_objs) == 1 and light_objs[0].type == "LIGHT", "point light created")
    check(bpy.context.scene.camera is not None, "scene camera set")
    check(bpy.context.scene.world is not None, "world/environment set")


def test_resync_replaces_not_duplicates():
    print("test_resync_replaces_not_duplicates")
    reset_blend()
    scene = scene_with([base_object("cube", "cube_01")])
    compiler.compile_scene(scene)
    compiler.compile_scene(scene)  # sync again
    check(len(objects_by_tag("cube_01")) == 1, "resync does not duplicate objects")


def main():
    test_primitives()
    test_composed()
    test_material_emissive_and_alpha()
    test_lights_camera_environment()
    test_resync_replaces_not_duplicates()

    print("")
    if FAILURES:
        print("CONFORMANCE FAILED: %d check(s) failed" % len(FAILURES), file=sys.stderr)
        sys.exit(1)
    print("CONFORMANCE PASSED")
    sys.exit(0)


if __name__ == "__main__":
    main()
