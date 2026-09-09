import { describe, it, expect } from "vitest";
import {
  parseMessage,
  serializeMessage,
  generatePairingCode,
  MessageSchema,
} from "./protocol";
import { createEmptyScene } from "@/lib/scene/factory";

describe("protocol messages", () => {
  it("parses a hello message", () => {
    const m = parseMessage({ type: "hello", role: "web", code: "H7K2" });
    expect(m?.type).toBe("hello");
  });

  it("parses a sync message with a valid scene", () => {
    const msg = { type: "sync", scene: createEmptyScene() };
    const m = parseMessage(msg);
    expect(m?.type).toBe("sync");
  });

  it("rejects a sync message with an invalid scene", () => {
    const m = parseMessage({ type: "sync", scene: { nope: true } });
    expect(m).toBeNull();
  });

  it("parses a sync_result", () => {
    const m = parseMessage({ type: "sync_result", ok: true, summary: "3 created" });
    expect(m?.type).toBe("sync_result");
  });

  it("parses from a JSON string", () => {
    const m = parseMessage('{"type":"ping"}');
    expect(m?.type).toBe("ping");
  });

  it("returns null for invalid JSON", () => {
    expect(parseMessage("{ broken")).toBeNull();
  });

  it("returns null for an unknown message type", () => {
    expect(parseMessage({ type: "nonsense" })).toBeNull();
  });

  it("round-trips serialize → parse", () => {
    const msg = MessageSchema.parse({ type: "paired", role: "blender" });
    expect(parseMessage(serializeMessage(msg))).toEqual(msg);
  });
});

describe("generatePairingCode", () => {
  it("produces a 4-char code from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePairingCode();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    }
  });
});
