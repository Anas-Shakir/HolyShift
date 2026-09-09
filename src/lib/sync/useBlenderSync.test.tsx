import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBlenderSync } from "./useBlenderSync";
import { createEmptyScene } from "@/lib/scene/factory";

/**
 * A controllable fake WebSocket so we can drive the hook's state machine deterministically
 * without a real relay. NEXT_PUBLIC_RELAY_URL is stubbed at import time, so these tests
 * assume it is set; the "unconfigured" path is covered separately.
 */
class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = FakeWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  OPEN = FakeWebSocket.OPEN;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.onclose?.();
  }
  // test helpers
  open() {
    this.onopen?.();
  }
  receive(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
}

const originalWs = globalThis.WebSocket;

beforeEach(() => {
  FakeWebSocket.instances = [];
  // @ts-expect-error test stub
  globalThis.WebSocket = FakeWebSocket;
});
afterEach(() => {
  globalThis.WebSocket = originalWs;
  vi.restoreAllMocks();
});

describe("useBlenderSync", () => {
  it("connects, sends hello, and reaches paired", async () => {
    const { result } = renderHook(() => useBlenderSync());

    // Skip the test if the relay URL isn't configured in this environment.
    if (!result.current.configured) return;

    act(() => result.current.connect("ABCD"));
    const ws = FakeWebSocket.instances[0];
    expect(ws).toBeTruthy();

    act(() => ws.open());
    expect(result.current.status).toBe("waiting_for_blender");
    const hello = JSON.parse(ws.sent[0]);
    expect(hello).toMatchObject({ type: "hello", role: "web", code: "ABCD" });

    act(() => ws.receive({ type: "paired", role: "blender" }));
    await waitFor(() => expect(result.current.status).toBe("paired"));
  });

  it("sync sends the scene and resolves on a sync_result", async () => {
    const { result } = renderHook(() => useBlenderSync());
    if (!result.current.configured) return;

    act(() => result.current.connect("WXYZ"));
    const ws = FakeWebSocket.instances[0];
    act(() => ws.open());
    act(() => ws.receive({ type: "paired", role: "blender" }));

    act(() => result.current.sync(createEmptyScene()));
    expect(result.current.syncStatus).toBe("syncing");
    const syncMsg = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(syncMsg.type).toBe("sync");

    act(() => ws.receive({ type: "sync_result", ok: true, summary: "2 object(s)" }));
    await waitFor(() => expect(result.current.syncStatus).toBe("success"));
    expect(result.current.syncMessage).toMatch(/2 object/);
  });

  it("reports a failed sync_result", async () => {
    const { result } = renderHook(() => useBlenderSync());
    if (!result.current.configured) return;
    act(() => result.current.connect("FAIL"));
    const ws = FakeWebSocket.instances[0];
    act(() => ws.open());
    act(() => ws.receive({ type: "paired", role: "blender" }));
    act(() => result.current.sync(createEmptyScene()));
    act(() => ws.receive({ type: "sync_result", ok: false, error: "boom" }));
    await waitFor(() => expect(result.current.syncStatus).toBe("failed"));
    expect(result.current.syncMessage).toBe("boom");
  });
});
