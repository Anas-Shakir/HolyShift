"""
HolyShift Blender add-on.

Connects Blender outbound to the HolyShift relay by a pairing code, receives scenes from
the web app, and rebuilds them with the deterministic bpy.data compiler. Target: Blender 4.2 LTS.
"""

bl_info = {
    "name": "HolyShift Sync",
    "author": "HolyShift",
    "version": (0, 1, 0),
    "blender": (4, 2, 0),
    "location": "View3D > Sidebar > HolyShift",
    "description": "Sync scenes from the HolyShift web app into Blender via a relay.",
    "category": "Import-Export",
}

import bpy

from . import panel
from . import connection


def register():
    panel.register_properties()
    for cls in panel.CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    connection.shutdown()
    for cls in reversed(panel.CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except RuntimeError:
            pass
    panel.unregister_properties()


if __name__ == "__main__":
    register()
