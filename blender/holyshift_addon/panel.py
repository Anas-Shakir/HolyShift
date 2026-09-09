"""
HolyShift add-on UI: an N-panel in the 3D viewport sidebar with a relay URL, a pairing
code field, Connect/Disconnect buttons, and a live status label.
"""

import bpy

from . import connection


class HOLYSHIFT_PT_panel(bpy.types.Panel):
    bl_label = "HolyShift"
    bl_idname = "HOLYSHIFT_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "HolyShift"

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        col = layout.column(align=True)
        col.prop(scene, "holyshift_relay_url", text="Relay")
        col.prop(scene, "holyshift_code", text="Code")

        status = connection.get_status()
        row = layout.row()
        row.label(text="Status: %s" % status["label"], icon=status["icon"])
        if status["detail"]:
            layout.label(text=status["detail"])

        if connection.is_active():
            layout.operator("holyshift.disconnect", text="Disconnect", icon="CANCEL")
        else:
            layout.operator("holyshift.connect", text="Connect", icon="PLAY")


class HOLYSHIFT_OT_connect(bpy.types.Operator):
    bl_idname = "holyshift.connect"
    bl_label = "Connect to HolyShift"

    def execute(self, context):
        scene = context.scene
        url = scene.holyshift_relay_url.strip()
        code = scene.holyshift_code.strip().upper()
        if not url or not code:
            self.report({"ERROR"}, "Enter both a relay URL and a pairing code.")
            return {"CANCELLED"}
        ok, message = connection.connect(url, code)
        if not ok:
            self.report({"ERROR"}, message)
            return {"CANCELLED"}
        self.report({"INFO"}, "Connecting to HolyShift…")
        return {"FINISHED"}


class HOLYSHIFT_OT_disconnect(bpy.types.Operator):
    bl_idname = "holyshift.disconnect"
    bl_label = "Disconnect from HolyShift"

    def execute(self, context):  # noqa: ARG002
        connection.disconnect()
        self.report({"INFO"}, "Disconnected from HolyShift.")
        return {"FINISHED"}


CLASSES = (HOLYSHIFT_PT_panel, HOLYSHIFT_OT_connect, HOLYSHIFT_OT_disconnect)


def register_properties():
    bpy.types.Scene.holyshift_relay_url = bpy.props.StringProperty(
        name="Relay URL",
        description="WebSocket URL of the HolyShift relay (wss://…)",
        default="wss://holyshift-relay.onrender.com",
    )
    bpy.types.Scene.holyshift_code = bpy.props.StringProperty(
        name="Pairing Code",
        description="The code shown in the HolyShift web app",
        default="",
    )


def unregister_properties():
    del bpy.types.Scene.holyshift_relay_url
    del bpy.types.Scene.holyshift_code
