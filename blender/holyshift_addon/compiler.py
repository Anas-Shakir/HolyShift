"""
HolyShift deterministic scene compiler for Blender 4.2.

Rebuilds a HolyShift scene (the same structured state used by the web app) into real
Blender objects using the bpy.data / bmesh APIs.

Reliability principle: we use bpy.data + bmesh construction and NEVER bpy.ops. Operators
depend on UI/context and behave unpredictably when driven programmatically; the data API
is context-free and deterministic, which matters against Blender's strict reader.

Every object HolyShift creates is tagged with a custom property `holyshift_id` so a resync
can remove exactly what it made without touching the user's own objects. A sync performs a
full rebuild of HolyShift-owned objects (simplest reliable behavior for the MVP).
"""

import math

try:
    import bpy
    import bmesh
    import mathutils
except ImportError:  # allows syntax import outside Blender (e.g. linters)
    bpy = None
    bmesh = None
    mathutils = None

TAG = "holyshift_id"
PRIMITIVES = {"cube", "sphere", "cylinder", "plane"}
COMPOSED = {"chair", "desk", "table", "monitor", "pc", "lamp"}


# ---------------------------------------------------------------------------
# Low-level bpy.data helpers (no bpy.ops)
# ---------------------------------------------------------------------------

def _new_mesh_object(name, bm, holyshift_id):
    """Bake a bmesh into a new mesh + object, link to the active collection, tag it."""
    mesh = bpy.data.meshes.new(name)
    mesh[TAG] = holyshift_id
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj[TAG] = holyshift_id
    bpy.context.collection.objects.link(obj)
    return obj


def _cube_bm(dimensions):
    bm = bmesh.new()
    # Unit cube (size=1 => edge length 1), then scale to dimensions via matrix.
    mat = mathutils.Matrix.Diagonal(
        (dimensions[0], dimensions[1], dimensions[2], 1.0)
    )
    bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
    return bm


def _sphere_bm(dimensions):
    bm = bmesh.new()
    radius = max(dimensions) / 2.0
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=radius)
    return bm


def _cylinder_bm(dimensions):
    bm = bmesh.new()
    radius = max(dimensions[0], dimensions[2]) / 2.0
    depth = dimensions[1]
    # Cone with equal radii == cylinder.
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=32,
        radius1=radius,
        radius2=radius,
        depth=depth,
    )
    return bm


def _plane_bm(dimensions):
    bm = bmesh.new()
    thickness = max(dimensions[1], 0.02)
    mat = mathutils.Matrix.Diagonal((dimensions[0], thickness, dimensions[2], 1.0))
    bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
    return bm


_PRIMITIVE_BUILDERS = {
    "cube": _cube_bm,
    "sphere": _sphere_bm,
    "cylinder": _cylinder_bm,
    "plane": _plane_bm,
}


def _make_material(name, material, holyshift_id):
    """Create a Principled-BSDF material from a HolyShift material dict."""
    mat = bpy.data.materials.new(name)
    mat[TAG] = holyshift_id
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r, g, b = _hex_to_rgb(material.get("color", "#b8bec9"))
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
        bsdf.inputs["Metallic"].default_value = float(material.get("metalness", 0.0))
        bsdf.inputs["Roughness"].default_value = float(material.get("roughness", 0.6))
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = float(material.get("opacity", 1.0))
        emissive = float(material.get("emissiveIntensity", 0.0))
        if emissive > 0.0 and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (r, g, b, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emissive
    # viewport fallback color
    mat.diffuse_color = (r, g, b, float(material.get("opacity", 1.0)))
    if float(material.get("opacity", 1.0)) < 1.0:
        mat.blend_method = "BLEND"
    return mat


def _hex_to_rgb(hex_color):
    """Convert #rgb or #rrggbb to a linear-ish 0..1 tuple (sRGB values, good enough)."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        r = int(h[0:2], 16) / 255.0
        g = int(h[2:4], 16) / 255.0
        b = int(h[4:6], 16) / 255.0
    except (ValueError, IndexError):
        return (0.72, 0.74, 0.79)
    return (r, g, b)


# The web preview (Three.js) is Y-up; Blender is Z-up. A point [x, y, z] in the web's
# Y-up frame maps to [x, -z, y] in Blender's Z-up frame. We convert the object's world
# position with this mapping and stand its (Y-up-built) geometry up with a +90° X rotation,
# composing the user's requested rotation on top.
_YUP_TO_ZUP_X = math.pi / 2.0


def _yup_to_zup_position(pos):
    """Map a Y-up position [x, y, z] to Blender's Z-up frame [x, -z, y]."""
    return (pos[0], -pos[2], pos[1])


def _apply_transform(obj, transform):
    pos = transform.get("position", [0, 0, 0])
    rot = transform.get("rotation", [0, 0, 0])
    scl = transform.get("scale", [1, 1, 1])
    # Position: Y-up -> Z-up.
    obj.location = _yup_to_zup_position(pos)
    # Rotation: stand the Y-up geometry up (+90° about X), then apply the requested
    # Euler rotation expressed in the same converted frame (x, -z, y).
    obj.rotation_euler = (
        _YUP_TO_ZUP_X + rot[0],
        -rot[2],
        rot[1],
    )
    # Scale maps component-wise under the axis swap (|-z| == z).
    obj.scale = (scl[0], scl[2], scl[1])


# ---------------------------------------------------------------------------
# Composed objects: an Empty parent + child part meshes (mirrors the web renderer)
# ---------------------------------------------------------------------------

def _part(name, size, position, material_dict, holyshift_id):
    bm = _cube_bm(size)
    obj = _new_mesh_object(name, bm, holyshift_id)
    obj.location = (position[0], position[1], position[2])
    _assign_material(obj, _make_material(name + "_mat", material_dict, holyshift_id))
    return obj


def _composed_parts(obj_type, dims, material):
    """Return a list of (name_suffix, size, position) parts for a composed type."""
    w, h, d = dims
    parts = []
    if obj_type in ("desk", "table"):
        top_t = h * 0.08
        leg_t = min(w, d) * 0.08
        leg_h = h - top_t
        parts.append(("top", (w, top_t, d), (0, h - top_t / 2, 0)))
        for sx in (-1, 1):
            for sz in (-1, 1):
                parts.append(
                    ("leg", (leg_t, leg_h, leg_t),
                     (sx * (w / 2 - leg_t), leg_h / 2, sz * (d / 2 - leg_t)))
                )
    elif obj_type == "chair":
        seat_h = h * 0.5
        seat_t = h * 0.08
        leg_t = min(w, d) * 0.12
        leg_h = seat_h - seat_t
        back_h = h - seat_h
        back_t = d * 0.1
        parts.append(("seat", (w, seat_t, d), (0, seat_h - seat_t / 2, 0)))
        parts.append(("back", (w, back_h, back_t), (0, seat_h + back_h / 2, -d / 2 + back_t / 2)))
        for sx in (-1, 1):
            for sz in (-1, 1):
                parts.append(
                    ("leg", (leg_t, leg_h, leg_t),
                     (sx * (w / 2 - leg_t), leg_h / 2, sz * (d / 2 - leg_t)))
                )
    elif obj_type == "monitor":
        stand_h = h * 0.25
        base_t = h * 0.05
        panel_h = h - stand_h
        parts.append(("panel", (w, panel_h, d), (0, stand_h + panel_h / 2, 0)))
        parts.append(("stand", (w * 0.1, stand_h, d), (0, stand_h / 2, 0)))
        parts.append(("base", (w * 0.5, base_t, d * 2), (0, base_t / 2, 0)))
    elif obj_type == "pc":
        parts.append(("tower", (w, h, d), (0, h / 2, 0)))
    elif obj_type == "lamp":
        base_t = h * 0.08
        stem_t = min(w, d) * 0.15
        shade_h = h * 0.25
        stem_h = h - base_t - shade_h
        parts.append(("base", (w, base_t, d), (0, base_t / 2, 0)))
        parts.append(("stem", (stem_t, stem_h, stem_t), (0, base_t + stem_h / 2, 0)))
        parts.append(("shade", (w, shade_h, d), (0, base_t + stem_h + shade_h / 2, 0)))
    return parts


def _assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# ---------------------------------------------------------------------------
# Object builders
# ---------------------------------------------------------------------------

def _build_primitive(spec):
    hid = spec["id"]
    builder = _PRIMITIVE_BUILDERS[spec["type"]]
    bm = builder(spec["dimensions"])
    obj = _new_mesh_object(spec.get("name", spec["type"]), bm, hid)
    _apply_transform(obj, spec["transform"])
    _assign_material(obj, _make_material(hid + "_mat", spec["material"], hid))
    return obj


def _build_composed(spec):
    hid = spec["id"]
    parent = bpy.data.objects.new(spec.get("name", spec["type"]), None)  # Empty
    parent[TAG] = hid
    bpy.context.collection.objects.link(parent)
    _apply_transform(parent, spec["transform"])

    for i, (suffix, size, pos) in enumerate(
        _composed_parts(spec["type"], spec["dimensions"], spec["material"])
    ):
        part = _part(f"{hid}_{suffix}_{i}", size, pos, spec["material"], hid)
        part.parent = parent
    return parent


def _build_object(spec):
    if spec["type"] in PRIMITIVES:
        return _build_primitive(spec)
    if spec["type"] in COMPOSED:
        return _build_composed(spec)
    raise ValueError("Unsupported object type: %s" % spec["type"])


def _build_light(spec):
    ld = bpy.data.lights.new(spec["id"], _blender_light_type(spec["type"]))
    ld[TAG] = spec["id"]  # tag the light data-block for cleanup
    r, g, b = _hex_to_rgb(spec.get("color", "#ffffff"))
    ld.color = (r, g, b)
    ld.energy = float(spec.get("intensity", 1.0)) * 1000.0 if spec["type"] == "point" else float(spec.get("intensity", 1.0))
    obj = bpy.data.objects.new(spec["id"], ld)
    obj[TAG] = spec["id"]
    pos = spec.get("position", [0, 0, 0])
    obj.location = (pos[0], pos[1], pos[2])
    bpy.context.collection.objects.link(obj)
    return obj


def _blender_light_type(t):
    return {
        "point": "POINT",
        "directional": "SUN",
        "spot": "SPOT",
        "ambient": "POINT",  # Blender has no ambient light object; approximate
    }.get(t, "POINT")


def _apply_camera(camera):
    cd = bpy.data.cameras.new("holyshift_camera")
    cd[TAG] = "camera"
    # vertical fov (deg) -> lens via sensor; simplest: set angle
    cd.angle = math.radians(float(camera.get("fov", 50)))
    obj = bpy.data.objects.new("holyshift_camera", cd)
    obj[TAG] = "camera"
    pos = camera.get("position", [6, 5, 6])
    obj.location = (pos[0], pos[1], pos[2])
    _aim_at(obj, camera.get("target", [0, 0, 0]))
    bpy.context.collection.objects.link(obj)
    bpy.context.scene.camera = obj
    return obj


def _aim_at(obj, target):
    direction = mathutils.Vector(
        (target[0] - obj.location.x, target[1] - obj.location.y, target[2] - obj.location.z)
    )
    if direction.length == 0:
        return
    # Camera looks down -Z with +Y up.
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def _apply_environment(environment):
    scene = bpy.context.scene
    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("holyshift_world")
        scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        r, g, b = _hex_to_rgb(environment.get("backgroundColor", "#0d0f14"))
        bg.inputs["Color"].default_value = (r, g, b, 1.0)
        bg.inputs["Strength"].default_value = float(environment.get("ambientIntensity", 0.35))


# ---------------------------------------------------------------------------
# Cleanup + public entrypoint
# ---------------------------------------------------------------------------

def _has_tag(datablock, hid=None):
    """True if a datablock carries our tag (optionally matching a specific id)."""
    try:
        if TAG not in datablock.keys():
            return False
    except (AttributeError, TypeError):
        return False
    return hid is None or datablock[TAG] == hid


def clear_holyshift():
    """
    Remove all objects/data previously created by HolyShift.

    Robust against parent/child ordering: we collect the tagged objects up front, then
    remove each one guarded by a validity/exception check (removing a parent can implicitly
    affect children). Orphaned mesh/light/camera/material data is purged afterwards, never
    mid-loop, to avoid touching freed references.
    """
    tagged_objects = [obj for obj in list(bpy.data.objects) if _has_tag(obj)]
    for obj in tagged_objects:
        try:
            bpy.data.objects.remove(obj, do_unlink=True)
        except (RuntimeError, ReferenceError):
            pass

    # Purge our tagged data-blocks that are now orphaned (0 users).
    for coll in (bpy.data.meshes, bpy.data.lights, bpy.data.cameras, bpy.data.materials):
        for block in list(coll):
            try:
                if _has_tag(block) and block.users == 0:
                    coll.remove(block)
            except (RuntimeError, ReferenceError):
                pass


def compile_scene(scene):
    """
    Rebuild `scene` (a HolyShift scene dict) in Blender. Returns a structured result:
      { "ok": True, "summary": "...", "counts": {...} } or { "ok": False, "error": "..." }
    """
    if bpy is None:
        return {"ok": False, "error": "bpy unavailable (not running inside Blender)."}
    try:
        clear_holyshift()
        counts = {"objects": 0, "lights": 0}
        for spec in scene.get("objects", []):
            _build_object(spec)
            counts["objects"] += 1
        for spec in scene.get("lights", []):
            _build_light(spec)
            counts["lights"] += 1
        if "camera" in scene:
            _apply_camera(scene["camera"])
        if "environment" in scene:
            _apply_environment(scene["environment"])
        summary = "%d object(s), %d light(s)" % (counts["objects"], counts["lights"])
        return {"ok": True, "summary": summary, "counts": counts}
    except Exception as exc:  # noqa: BLE001 - report any failure to the web app
        return {"ok": False, "error": "%s: %s" % (type(exc).__name__, exc)}
