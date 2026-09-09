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
        self._outbox = queue.Queue()  # main thread -> relay (dicts to send)
        self._connected = False
        self._paired = False
        self._status = "disconnected"
        self._error = None
        self._should_run = False

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

    # ---- socket thread ----
    def _run(self):
        def on_open(ws):
            self._connected = True
            self._status = "waiting_for_blender"
            ws.send(json.dumps({"type": "hello", "role": "blender", "code": self.code}))

        def on_message(ws, message):
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
                self._outbox.put({"type": "pong"})
            # Hand everything to the main thread (it decides what to act on).
            self._inbox.put(data)

        def on_error(ws, err):  # noqa: ARG001
            self._error = str(err)
            self._status = "error"

        def on_close(ws, *args):  # noqa: ARG001
            self._connected = False
            self._paired = False
            if self._should_run:
                self._status = "disconnected"

        self._ws = websocket.WebSocketApp(
            self.url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
        )

        # Flush outbound queue on a helper thread so run_forever isn't blocked.
        def pump_outbox():
            while self._should_run:
                try:
                    msg = self._outbox.get(timeout=0.25)
                except queue.Empty:
                    continue
                try:
                    if self._ws is not None:
                        self._ws.send(json.dumps(msg))
                except Exception:  # noqa: BLE001
                    pass

        threading.Thread(target=pump_outbox, name="holyshift-outbox", daemon=True).start()

        # Blocks until close; ping_interval keeps the relay connection warm.
        self._ws.run_forever(ping_interval=20, ping_timeout=10)

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
        """Queue an outbound message (safe from the main thread)."""
        self._outbox.put(message)
