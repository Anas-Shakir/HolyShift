"""
HolyShift Blender-side WebSocket client.

Threading model (this is the crux):
  - `websocket-client`'s run_forever() BLOCKS, so it runs on a BACKGROUND thread.
  - bpy is NOT thread-safe, so we NEVER touch bpy from that thread. Incoming messages are
    pushed onto a thread-safe queue.Queue.
  - A `bpy.app.timers` callback drains the queue on Blender's MAIN thread, where it is safe
    to run the compiler and mutate the scene, then queues an outbound sync_result.

Outbound messages are also queued and flushed from the socket thread, so the main thread
never blocks on network I/O.
"""

import json
import queue
import threading

try:
    import websocket  # from the "websocket-client" package
except ImportError:  # handled by the panel with an install hint
    websocket = None


class HolyShiftClient:
    """Manages one relay connection for the Blender side."""

    def __init__(self, url, code):
        self.url = url
        self.code = code
        self._ws = None
        self._thread = None
        self._inbox = queue.Queue()   # relay -> main thread (parsed dicts)
        self._connected = False
        self._paired = False
        self._status = "disconnected"
        self._error = None
        self._should_run = False
        # All sends go through this lock so we never send concurrently with the
        # library's internal ping frames (websocket-client is not send-safe otherwise).
        self._send_lock = threading.Lock()

    # ---- state (read from the main thread / panel) ----
    @property
    def status(self):
        return self._status

    @property
    def error(self):
        return self._error

    @property
    def paired(self):
        return self._paired

    # ---- lifecycle ----
    def start(self):
        if websocket is None:
            self._status = "error"
            self._error = "websocket-client not installed"
            return False
        self._should_run = True
        self._status = "connecting"
        self._thread = threading.Thread(target=self._run, name="holyshift-ws", daemon=True)
        self._thread.start()
        return True

    def stop(self):
        self._should_run = False
        try:
            if self._ws is not None:
                self._ws.close()
        except Exception:  # noqa: BLE001
            pass
        self._status = "disconnected"
        self._paired = False

    def _safe_send(self, obj):
        """Send a JSON message under the lock. Returns True on success."""
        ws = self._ws
        if ws is None:
            return False
        try:
            with self._send_lock:
                ws.send(json.dumps(obj))
            return True
        except Exception:  # noqa: BLE001 - connection may be mid-close
            return False

    # ---- socket thread ----
    def _run(self):
        def on_open(ws):
            self._connected = True
            self._status = "waiting_for_blender"
            # Re-announce on every (re)connect so pairing re-establishes automatically.
            self._safe_send({"type": "hello", "role": "blender", "code": self.code})

        def on_message(ws, message):  # noqa: ARG001
            try:
                data = json.loads(message)
            except (ValueError, TypeError):
                return
            mtype = data.get("type")
            if mtype == "paired":
                self._paired = True
                self._status = "paired"
            elif mtype == "peer_left":
                self._paired = False
                self._status = "waiting_for_blender"
            elif mtype == "ping":
                # Reply immediately on this thread, under the lock.
                self._safe_send({"type": "pong"})
                return
            elif mtype == "pong":
                return
            # Hand everything else to the main thread (it decides what to act on).
            self._inbox.put(data)

        def on_error(ws, err):  # noqa: ARG001
            self._error = str(err)
            # Do not force "error" permanently; reconnect may recover it.
            if self._status != "paired":
                self._status = "connecting"

        def on_close(ws, *args):  # noqa: ARG001
            self._connected = False
            self._paired = False
            if self._should_run:
                self._status = "connecting"

        self._ws = websocket.WebSocketApp(
            self.url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
        )

        # run_forever manages its own ping loop AND auto-reconnects on drop. All our sends
        # go through _safe_send (locked), so they never collide with library ping frames.
        while self._should_run:
            try:
                self._ws.run_forever(ping_interval=20, ping_timeout=10, reconnect=3)
            except Exception as exc:  # noqa: BLE001
                self._error = str(exc)
            if not self._should_run:
                break
            # Brief backoff before reconnecting.
            import time

            time.sleep(2)

    # ---- main-thread API (called by the timer) ----
    def drain_inbox(self):
        """Pop all pending inbound messages (call on the MAIN thread)."""
        items = []
        while True:
            try:
                items.append(self._inbox.get_nowait())
            except queue.Empty:
                break
        return items

    def send(self, message):
        """Send an outbound message (safe to call from the main thread; locked internally)."""
        return self._safe_send(message)
