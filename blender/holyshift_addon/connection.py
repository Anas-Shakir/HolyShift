"""
Connection manager: owns the single HolyShiftClient, registers the MAIN-thread timer that
drains the client's inbox, runs the compiler on `sync` messages, and sends `sync_result`
back. This is the bridge between the background socket thread and bpy.

Keeping this in its own module (not the panel) means the timer and client survive panel
redraws and there is exactly one connection.
"""

import bpy

from .client import HolyShiftClient
from . import compiler

_client = None
_timer_registered = False
_last_result = None  # human-readable summary/error of the most recent sync


def is_active():
    return _client is not None


def get_status():
    """Return a dict for the panel: { label, icon, detail }."""
    if _client is None:
        return {"label": "disconnected", "icon": "UNLINKED", "detail": ""}
    status = _client.status
    icon = {
        "connecting": "SORTTIME",
        "waiting_for_blender": "SORTTIME",
        "paired": "LINKED",
        "error": "ERROR",
        "disconnected": "UNLINKED",
    }.get(status, "QUESTION")
    detail = _client.error or (_last_result or "")
    return {"label": status, "icon": icon, "detail": detail}


def connect(url, code):
    global _client
    if _client is not None:
        disconnect()
    _client = HolyShiftClient(url, code)
    ok = _client.start()
    if not ok:
        message = _client.error or "Failed to start client"
        _client = None
        return False, message
    _ensure_timer()
    return True, "ok"


def disconnect():
    global _client
    if _client is not None:
        _client.stop()
        _client = None


def _ensure_timer():
    global _timer_registered
    if not _timer_registered:
        bpy.app.timers.register(_drain, persistent=True)
        _timer_registered = True


def _drain():
    """MAIN-thread callback: apply queued sync messages, send results back."""
    global _last_result
    if _client is None:
        return 0.5  # keep polling in case a new connection appears

    for message in _client.drain_inbox():
        if message.get("type") == "sync":
            scene = message.get("scene")
            result = compiler.compile_scene(scene) if scene is not None else {
                "ok": False,
                "error": "sync message had no scene",
            }
            _last_result = result.get("summary") or result.get("error") or ""
            payload = {
                "type": "sync_result",
                "ok": bool(result.get("ok")),
                "summary": result.get("summary"),
                "error": result.get("error"),
            }
            # Retry once if the first send fails (connection may be mid-refresh).
            if not _client.send(payload):
                _client.send(payload)
    return 0.2  # poll again in 200ms


def shutdown():
    """Called on add-on unregister."""
    global _timer_registered
    disconnect()
    if _timer_registered:
        try:
            bpy.app.timers.unregister(_drain)
        except (ValueError, Exception):  # noqa: BLE001
            pass
        _timer_registered = False
