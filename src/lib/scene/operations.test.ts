import { describe, it, expect } from "vitest";
import {
  addObject,
  updateObject,
  removeObject,
  updateEnvironment,
  updateCamera,
  updateLights,
  SceneOperationError,
} from "./operations";
import { createEmptyScene } from "./factory";
import { byOrdinal, byType, byId } from "./resolve";
import { SceneSchema } from "./schema";

describe("addObject", () => {
  it("adds an object and preserves the rest of the scene", () => {
    const s0 = createEmptyScene();
    const s1 = addObject(s0, "desk");
    expect(s1.objects).toHaveLength(1);
    // immutable: original untouched
    expect(s0.objects).toHaveLength(0);
    expect(SceneSchema.safeParse(s1).success).toBe(true);
  });

  it("assigns unique ids across repeated adds of the same type", () => {
    let s = createEmptyScene();
    s = addObject(s, "monitor");
    s = addObject(s, "monitor");
    const ids = byType(s, "monitor").map((o) => o.id);
    expect(ids).toEqual(["monitor_01", "monitor_02"]);
  });
});

describe("updateObject", () => {
  it("merges only targeted fields and preserves others", () => {
    let s = createEmptyScene();
    s = addObject(s, "desk");
    const id = s.objects[0].id;
    const before = s.objects[0];

    s = updateObject(s, id, { transform: { position: [1, 0, 0] } });
    const after = byId(s, id)!;

    expect(after.transform.position).toEqual([1, 0, 0]);
    // rotation/scale preserved
    expect(after.transform.rotation).toEqual(before.transform.rotation);
    expect(after.transform.scale).toEqual(before.transform.scale);
    // dimensions/material preserved
    expect(after.dimensions).toEqual(before.dimensions);
    expect(after.material).toEqual(before.material);
  });

  it("merges a partial material patch", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    const id = s.objects[0].id;
    s = updateObject(s, id, { material: { color: "#ff0000" } });
    const obj = byId(s, id)!;
    expect(obj.material.color).toBe("#ff0000");
    // other material fields intact
    expect(obj.material.roughness).toBeGreaterThanOrEqual(0);
  });

  it("does not touch other objects", () => {
    let s = createEmptyScene();
    s = addObject(s, "desk");
    s = addObject(s, "chair");
    const chairBefore = byType(s, "chair")[0];
    const deskId = byType(s, "desk")[0].id;
    s = updateObject(s, deskId, { name: "Wide Desk" });
    expect(byType(s, "chair")[0]).toEqual(chairBefore);
  });

  it("throws for a missing id", () => {
    const s = createEmptyScene();
    expect(() => updateObject(s, "nope_99", { name: "x" })).toThrow(SceneOperationError);
  });
});

describe("removeObject", () => {
  it("removes only the targeted object", () => {
    let s = createEmptyScene();
    s = addObject(s, "desk");
    s = addObject(s, "chair");
    const deskId = byType(s, "desk")[0].id;
    s = removeObject(s, deskId);
    expect(byType(s, "desk")).toHaveLength(0);
    expect(byType(s, "chair")).toHaveLength(1);
  });

  it("throws for a missing id", () => {
    expect(() => removeObject(createEmptyScene(), "nope_99")).toThrow(SceneOperationError);
  });
});

describe("environment / camera / lights", () => {
  it("updates the environment immutably", () => {
    const s0 = createEmptyScene();
    const s1 = updateEnvironment(s0, { ambientIntensity: 0.9 });
    expect(s1.environment.ambientIntensity).toBe(0.9);
    expect(s0.environment.ambientIntensity).not.toBe(0.9);
  });

  it("rejects an invalid environment patch", () => {
    expect(() => updateEnvironment(createEmptyScene(), { backgroundColor: "purple" as never })).toThrow(
      SceneOperationError,
    );
  });

  it("updates the camera", () => {
    const s = updateCamera(createEmptyScene(), { fov: 35 });
    expect(s.camera.fov).toBe(35);
  });

  it("replaces lights", () => {
    const s = updateLights(createEmptyScene(), [
      { id: "light_01", type: "point", color: "#ffffff", intensity: 1, position: [0, 3, 0] },
    ]);
    expect(s.lights).toHaveLength(1);
  });
});

describe("reference resolution", () => {
  it("resolves ordinal references (the second monitor)", () => {
    let s = createEmptyScene();
    s = addObject(s, "monitor", { name: "Left" });
    s = addObject(s, "monitor", { name: "Right" });
    expect(byOrdinal(s, "monitor", 2)?.name).toBe("Right");
    expect(byOrdinal(s, "monitor", 1)?.name).toBe("Left");
    expect(byOrdinal(s, "monitor", 3)).toBeUndefined();
  });
});

describe("scripted blueprint editing sequence", () => {
  it("preserves existing objects while modifying only what was asked", () => {
    // Create a desk -> Add a chair -> Move the chair closer -> Make the desk wider
    // -> Add a monitor -> Make the monitor larger -> Remove the chair
    let s = createEmptyScene();

    s = addObject(s, "desk");
    const deskId = byType(s, "desk")[0].id;

    s = addObject(s, "chair");
    const chairId = byType(s, "chair")[0].id;

    // move the chair closer (toward origin on z)
    s = updateObject(s, chairId, { transform: { position: [0, 0, -0.5] } });
    expect(byId(s, chairId)!.transform.position).toEqual([0, 0, -0.5]);

    // make the desk wider (increase x dimension)
    const deskDims = byId(s, deskId)!.dimensions;
    s = updateObject(s, deskId, { dimensions: [deskDims[0] * 1.5, deskDims[1], deskDims[2]] });
    expect(byId(s, deskId)!.dimensions[0]).toBeCloseTo(deskDims[0] * 1.5);

    // add a monitor
    s = addObject(s, "monitor");
    const monitorId = byType(s, "monitor")[0].id;

    // make the monitor larger (scale up)
    s = updateObject(s, monitorId, { transform: { scale: [1.4, 1.4, 1.4] } });
    expect(byId(s, monitorId)!.transform.scale).toEqual([1.4, 1.4, 1.4]);

    // the desk and its width change are still intact after later edits
    expect(byId(s, deskId)!.dimensions[0]).toBeCloseTo(deskDims[0] * 1.5);

    // remove the chair
    s = removeObject(s, chairId);
    expect(byId(s, chairId)).toBeUndefined();

    // final world: desk + monitor remain, chair gone
    expect(byType(s, "desk")).toHaveLength(1);
    expect(byType(s, "monitor")).toHaveLength(1);
    expect(byType(s, "chair")).toHaveLength(0);
    expect(SceneSchema.safeParse(s).success).toBe(true);
  });
});
