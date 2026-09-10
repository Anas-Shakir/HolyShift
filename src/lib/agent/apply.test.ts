import { describe, it, expect } from "vitest";
import { applyPatch } from "./apply";
import { ScenePatchSchema } from "./patch";
import { createEmptyScene } from "@/lib/scene/factory";
import { addObject } from "@/lib/scene/operations";
import { byType, byId } from "@/lib/scene/resolve";
import type { Scene } from "@/lib/scene/schema";

function parse(patch: unknown) {
  const r = ScenePatchSchema.safeParse(patch);
  if (!r.success) throw new Error("test patch invalid: " + JSON.stringify(r.error.issues));
  return r.data;
}

describe("applyPatch — create", () => {
  it("creates objects and assigns stable ids", () => {
    const patch = parse({
      operations: [
        { op: "create", object: { type: "desk" } },
        { op: "create", object: { type: "monitor" } },
        { op: "create", object: { type: "monitor" } },
      ],
    });
    const { scene, applied, errors } = applyPatch(createEmptyScene(), patch);
    expect(errors).toHaveLength(0);
    expect(applied).toHaveLength(3);
    expect(byType(scene, "monitor").map((o) => o.id)).toEqual(["monitor_01", "monitor_02"]);
  });

  it("applies create material/position overrides", () => {
    const patch = parse({
      operations: [
        {
          op: "create",
          object: { type: "cube", name: "Red", position: [1, 2, 3], material: { color: "#ff0000" } },
        },
      ],
    });
    const { scene } = applyPatch(createEmptyScene(), patch);
    const cube = byType(scene, "cube")[0];
    expect(cube.name).toBe("Red");
    expect(cube.transform.position).toEqual([1, 2, 3]);
    expect(cube.material.color).toBe("#ff0000");
  });
});

describe("applyPatch — update / delete with reference resolution", () => {
  function twoMonitors(): Scene {
    let s = createEmptyScene();
    s = addObject(s, "monitor", { name: "Left" });
    s = addObject(s, "monitor", { name: "Right" });
    return s;
  }

  it("updates by id", () => {
    const s = twoMonitors();
    const patch = parse({
      operations: [{ op: "update", target: { id: "monitor_01" }, changes: { name: "Primary" } }],
    });
    const { scene, errors } = applyPatch(s, patch);
    expect(errors).toHaveLength(0);
    expect(byId(scene, "monitor_01")!.name).toBe("Primary");
    // other monitor untouched
    expect(byId(scene, "monitor_02")!.name).toBe("Right");
  });

  it("updates by type + ordinal (the second monitor)", () => {
    const patch = parse({
      operations: [
        { op: "update", target: { type: "monitor", ordinal: 2 }, changes: { position: [2, 0, 0] } },
      ],
    });
    const { scene, errors } = applyPatch(twoMonitors(), patch);
    expect(errors).toHaveLength(0);
    expect(byId(scene, "monitor_02")!.transform.position).toEqual([2, 0, 0]);
  });

  it("returns an error for an ambiguous type reference", () => {
    const patch = parse({
      operations: [{ op: "update", target: { type: "monitor" }, changes: { name: "X" } }],
    });
    const { errors, applied } = applyPatch(twoMonitors(), patch);
    expect(applied).toHaveLength(0);
    expect(errors[0]).toMatch(/ambiguous/i);
  });

  it("deletes by ordinal and preserves the rest", () => {
    const patch = parse({
      operations: [{ op: "delete", target: { type: "monitor", ordinal: 1 } }],
    });
    const { scene } = applyPatch(twoMonitors(), patch);
    expect(byType(scene, "monitor")).toHaveLength(1);
    expect(byId(scene, "monitor_01")).toBeUndefined();
  });

  it("records an error for a missing target without aborting later ops", () => {
    const patch = parse({
      operations: [
        { op: "update", target: { id: "ghost_99" }, changes: { name: "X" } },
        { op: "create", object: { type: "chair" } },
      ],
    });
    const { scene, applied, errors } = applyPatch(createEmptyScene(), patch);
    expect(errors).toHaveLength(1);
    expect(applied).toHaveLength(1);
    expect(byType(scene, "chair")).toHaveLength(1);
  });
});

describe("applyPatch — environment / lights", () => {
  it("sets environment fields", () => {
    const patch = parse({
      operations: [{ op: "setEnvironment", changes: { ambientIntensity: 0.9, backgroundColor: "#101020" } }],
    });
    const { scene } = applyPatch(createEmptyScene(), patch);
    expect(scene.environment.ambientIntensity).toBe(0.9);
    expect(scene.environment.backgroundColor).toBe("#101020");
  });

  it("adds and removes lights", () => {
    const add = parse({
      operations: [
        { op: "addLight", light: { type: "point", color: "#a020f0", intensity: 3, position: [0, 3, 0] } },
      ],
    });
    const afterAdd = applyPatch(createEmptyScene(), add);
    expect(afterAdd.scene.lights).toHaveLength(1);
    const id = afterAdd.scene.lights[0].id;

    const remove = parse({ operations: [{ op: "removeLight", id }] });
    const afterRemove = applyPatch(afterAdd.scene, remove);
    expect(afterRemove.scene.lights).toHaveLength(0);
  });
});

describe("applyPatch — group composition", () => {
  it("creates a group from AI children (partial material filled in)", () => {
    const patch = parse({
      operations: [
        {
          op: "create",
          object: {
            type: "group",
            name: "Potted Plant",
            children: [
              { type: "cylinder", position: [0, 0.15, 0], dimensions: [0.3, 0.3, 0.3], material: { color: "#8b5a2b" } },
              { type: "sphere", position: [0, 0.6, 0], dimensions: [0.5, 0.5, 0.5], material: { color: "#3f7d3a" } },
            ],
          },
        },
      ],
    });
    const { scene, errors } = applyPatch(createEmptyScene(), patch);
    expect(errors).toHaveLength(0);
    const group = byType(scene, "group")[0];
    expect(group).toBeTruthy();
    expect(group.children).toHaveLength(2);
    // partial material was completed to a full material
    expect(group.children?.[0].material.roughness).toBeGreaterThanOrEqual(0);
    expect(group.children?.[0].material.color).toBe("#8b5a2b");
  });
});

describe("applyPatch — clarification", () => {
  it("passes clarification through and makes no changes", () => {
    const patch = parse({ operations: [], clarification: "Which monitor do you mean?" });
    const s0 = addObject(createEmptyScene(), "monitor");
    const { scene, clarification } = applyPatch(s0, patch);
    expect(clarification).toMatch(/which monitor/i);
    expect(scene).toEqual(s0);
  });
});

describe("applyPatch — state-aware sequence", () => {
  it("preserves prior objects across a multi-step conversation", () => {
    let s = createEmptyScene();
    s = applyPatch(s, parse({ operations: [{ op: "create", object: { type: "desk" } }] })).scene;
    s = applyPatch(s, parse({ operations: [{ op: "create", object: { type: "chair" } }] })).scene;
    s = applyPatch(
      s,
      parse({
        operations: [{ op: "update", target: { type: "chair" }, changes: { position: [0, 0, -0.5] } }],
      }),
    ).scene;
    s = applyPatch(s, parse({ operations: [{ op: "create", object: { type: "monitor" } }] })).scene;
    s = applyPatch(
      s,
      parse({
        operations: [{ op: "setEnvironment", changes: { backgroundColor: "#1a0033" } }],
      }),
    ).scene;

    expect(byType(s, "desk")).toHaveLength(1);
    expect(byType(s, "chair")).toHaveLength(1);
    expect(byType(s, "monitor")).toHaveLength(1);
    expect(byType(s, "chair")[0].transform.position).toEqual([0, 0, -0.5]);
    expect(s.environment.backgroundColor).toBe("#1a0033");
  });
});
