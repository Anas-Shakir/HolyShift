import { describe, it, expect, beforeEach } from "vitest";
import {
  serialize,
  deserialize,
  saveToStorage,
  loadFromStorage,
  SceneDeserializeError,
  STORAGE_KEY,
} from "./serialize";
import { createEmptyScene, createDefaultObject } from "./factory";
import { addObjectRaw } from "./operations";

function sampleScene() {
  const s = createEmptyScene("Round Trip");
  return addObjectRaw(s, createDefaultObject("desk"));
}

describe("serialize / deserialize", () => {
  it("round-trips losslessly", () => {
    const s = sampleScene();
    const restored = deserialize(serialize(s));
    expect(restored).toEqual(s);
  });

  it("rejects invalid JSON", () => {
    expect(() => deserialize("{ nope")).toThrow(SceneDeserializeError);
  });

  it("rejects an unsupported schema version", () => {
    const s = sampleScene();
    const raw = JSON.parse(serialize(s));
    raw.metadata.version = 999;
    expect(() => deserialize(JSON.stringify(raw))).toThrow(/version/i);
  });

  it("rejects a structurally invalid scene", () => {
    const s = sampleScene();
    const raw = JSON.parse(serialize(s));
    raw.objects[0].type = "teapot";
    expect(() => deserialize(JSON.stringify(raw))).toThrow(SceneDeserializeError);
  });
});

describe("localStorage persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadFromStorage()).toBeNull();
  });

  it("saves and restores a scene", () => {
    const s = sampleScene();
    saveToStorage(s);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loadFromStorage()).toEqual(s);
  });

  it("returns null (does not throw) for corrupt stored data", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ corrupt");
    expect(loadFromStorage()).toBeNull();
  });
});
