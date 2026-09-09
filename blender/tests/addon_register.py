"""
Headless check that the add-on registers/unregisters cleanly inside Blender.

Run: blender --background --python blender/tests/addon_register.py
Exit 0 = registered and unregistered without error.
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ADDON_PARENT = os.path.normpath(os.path.join(_HERE, ".."))
if _ADDON_PARENT not in sys.path:
    sys.path.insert(0, _ADDON_PARENT)

import bpy  # noqa: E402
import holyshift_addon  # noqa: E402


def main():
    holyshift_addon.register()
    assert hasattr(bpy.types.Scene, "holyshift_code"), "scene props not registered"
    assert "HOLYSHIFT_PT_panel" in dir(bpy.types), "panel class not registered"
    print("  ok: add-on registered")

    holyshift_addon.unregister()
    print("  ok: add-on unregistered")
    print("ADDON REGISTER PASSED")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print("ADDON REGISTER FAILED: %s: %s" % (type(exc).__name__, exc), file=sys.stderr)
        sys.exit(1)
    sys.exit(0)
