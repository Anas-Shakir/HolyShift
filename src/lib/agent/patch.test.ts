import { describe, it, expect } from "vitest";
import { CAPABILITIES } from "./manifest";
import { ScenePatchSchema, OperationSchema } from "./patch";
import { OBJECT_TYPES, LIGHT_TYPES } from "@/lib/scene/schema";
import { SCENE_PATCH_JSON_SCHEMA } from "./patchSchema";

describe("capability manifest", () => {
  it("stays in lockstep with the Spec 1 schema (no drift)", () => {
    expect([...CAPABILITIES.objectTypes].sort()).toEqual([...OBJECT_TYPES].sort());
    expect([...CAPABILITIES.lightTypes].sort()).toEqual([...LIGHT_TYPES].sort());
  });
});

describe("ScenePatchSchema", () => {
  it("accepts a create operation", () => {
    const patch = {
      operations: [{ op: "create", object: { type: "desk", name: "Desk" } }],
    };
    expect(ScenePatchSchema.safeParse(patch).success).toBe(true);
  });

  it("accepts update by id and by type+ordinal", () => {
    expect(
      OperationSchema.safeParse({
        op: "update",
        target: { id: "monitor_01" },
        changes: { material: { color: "#ff0000" } },
      }).success,
    ).toBe(true);
    expect(
      OperationSchema.safeParse({
        op: "update",
        target: { type: "monitor", ordinal: 2 },
        changes: { position: [1, 0, 0] },
      }).success,
    ).toBe(true);
  });

  it("accepts delete, setEnvironment, addLight, removeLight", () => {
    expect(OperationSchema.safeParse({ op: "delete", target: { id: "cube_01" } }).success).toBe(true);
    expect(
      OperationSchema.safeParse({ op: "setEnvironment", changes: { ambientIntensity: 0.8 } }).success,
    ).toBe(true);
    expect(
      OperationSchema.safeParse({
        op: "addLight",
        light: { type: "point", color: "#ffffff", intensity: 2, position: [0, 3, 0] },
      }).success,
    ).toBe(true);
    expect(OperationSchema.safeParse({ op: "removeLight", id: "light_01" }).success).toBe(true);
  });

  it("rejects an unsupported object type", () => {
    expect(
      OperationSchema.safeParse({ op: "create", object: { type: "dragon" } }).success,
    ).toBe(false);
  });

  it("rejects unknown material fields (strict)", () => {
    expect(
      OperationSchema.safeParse({
        op: "update",
        target: { id: "x" },
        changes: { material: { glow: 5 } },
      }).success,
    ).toBe(false);
  });

  it("accepts a clarification-only patch", () => {
    expect(
      ScenePatchSchema.safeParse({ operations: [], clarification: "Which monitor?" }).success,
    ).toBe(true);
  });
});

describe("SCENE_PATCH_JSON_SCHEMA", () => {
  it("is a strict object schema with operations + clarification", () => {
    expect(SCENE_PATCH_JSON_SCHEMA.type).toBe("object");
    expect(SCENE_PATCH_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(SCENE_PATCH_JSON_SCHEMA.required).toContain("operations");
    expect(SCENE_PATCH_JSON_SCHEMA.required).toContain("clarification");
  });
});
