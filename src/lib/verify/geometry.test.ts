import { describe, it, expect } from "vitest";
import { aabb, overlaps, footprintOverlaps, isBottomAnchored } from "./boxes";
import { verifyGeometry } from "./geometry";
import { createEmptyScene } from "@/lib/scene/factory";
import { addObject, updateObject } from "@/lib/scene/operations";
import type { Scene } from "@/lib/scene/schema";

function sceneWithCube(pos: [number, number, number], scale: [number, number, number] = [1, 1, 1]): Scene {
  let s = createEmptyScene();
  s = addObject(s, "cube"); // 1x1x1 at origin
  const id = s.objects[0].id;
  s = updateObject(s, id, { transform: { position: pos, scale } });
  return s;
}

describe("aabb", () => {
  it("computes center + half extents with scale (position is center)", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 1, 0], scale: [2, 2, 2] } });
    const box = aabb(s.objects[0]);
    expect(box.halfExtents).toEqual([1, 1, 1]); // 1*2/2
    expect(box.min[1]).toBe(0); // base at floor
    expect(box.max[1]).toBe(2);
  });
});

describe("overlap helpers", () => {
  it("overlaps true when boxes intersect on all axes", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    s = addObject(s, "cube");
    const a = aabb(s.objects[0]);
    const b = aabb(s.objects[1]); // both at origin
    expect(overlaps(a, b, 0.05)).toBe(true);
  });
  it("footprintOverlaps checks x/z only", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    s = addObject(s, "cube");
    s = updateObject(s, s.objects[1].id, { transform: { position: [0, 5, 0] } });
    expect(footprintOverlaps(aabb(s.objects[0]), aabb(s.objects[1]))).toBe(true);
  });
});

describe("verifyGeometry", () => {
  it("finds nothing wrong with an object resting on the floor", () => {
    // cube 1x1x1 centered at y=0.5 → base at 0
    const s = sceneWithCube([0, 0.5, 0]);
    expect(verifyGeometry(s)).toHaveLength(0);
  });

  it("detects a floating object and suggests a drop-to-floor fix", () => {
    const s = sceneWithCube([0, 3, 0]); // base at 2.5
    const issues = verifyGeometry(s);
    const floating = issues.find((i) => i.kind === "floating");
    expect(floating).toBeTruthy();
    expect(floating!.fix).toBeTruthy();
    // fix lowers y so base reaches floor: new center y = 0.5
    expect(floating!.fix!.patch.transform!.position![1]).toBeCloseTo(0.5);
  });

  it("detects a below-floor object and lifts it", () => {
    const s = sceneWithCube([0, -1, 0]); // base at -1.5
    const issues = verifyGeometry(s);
    const below = issues.find((i) => i.kind === "below_floor");
    expect(below).toBeTruthy();
    expect(below!.fix!.patch.transform!.position![1]).toBeCloseTo(0.5);
  });

  it("does not flag a floating object that has support beneath it", () => {
    // support resting on floor (center 0.5 → top 1.0) + object resting on it (center 1.5 → base 1.0)
    let s = createEmptyScene();
    s = addObject(s, "cube", { name: "Support" });
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 0.5, 0] } }); // top at 1.0
    s = addObject(s, "cube", { name: "OnTop" });
    s = updateObject(s, s.objects[1].id, { transform: { position: [0, 1.5, 0] } }); // base at 1.0 == support top
    const issues = verifyGeometry(s);
    expect(issues.find((i) => i.kind === "floating")).toBeFalsy();
  });

  it("detects interpenetration between two overlapping objects", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    s = addObject(s, "cube");
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 0.5, 0] } });
    s = updateObject(s, s.objects[1].id, { transform: { position: [0.3, 0.5, 0] } });
    const issues = verifyGeometry(s);
    expect(issues.find((i) => i.kind === "interpenetration")).toBeTruthy();
  });

  it("detects an out-of-bounds object", () => {
    const s = sceneWithCube([100, 0.5, 0]);
    expect(verifyGeometry(s).find((i) => i.kind === "out_of_bounds")).toBeTruthy();
  });

  it("detects bad scale and suggests resetting the axis to 1", () => {
    const s = sceneWithCube([0, 0.5, 0], [0, 1, 1]); // sx = 0
    const issue = verifyGeometry(s).find((i) => i.kind === "bad_scale");
    expect(issue).toBeTruthy();
    expect(issue!.fix!.patch.transform!.scale![0]).toBe(1);
  });

  it("does not flag a floor plane as floating", () => {
    let s = createEmptyScene();
    s = addObject(s, "plane"); // thin, at origin
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 0, 0] } });
    expect(verifyGeometry(s).find((i) => i.kind === "floating")).toBeFalsy();
  });

  // --- anchoring: composed objects are BOTTOM-anchored (base at position.y) ---

  it("does NOT flag a composed object sitting at y=0 (base on floor)", () => {
    let s = createEmptyScene();
    s = addObject(s, "desk"); // default position [0,0,0] -> base at 0 (bottom-anchored)
    const issues = verifyGeometry(s);
    expect(issues.find((i) => i.kind === "below_floor")).toBeFalsy();
    expect(issues.find((i) => i.kind === "floating")).toBeFalsy();
  });

  it("flags a composed object raised above the floor and drops it back to y=0", () => {
    let s = createEmptyScene();
    s = addObject(s, "desk");
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 2, 0] } }); // base at 2
    const floating = verifyGeometry(s).find((i) => i.kind === "floating");
    expect(floating).toBeTruthy();
    // fix should bring the base (position.y for bottom-anchored) back to the floor => y = 0
    expect(floating!.fix!.patch.transform!.position![1]).toBeCloseTo(0);
  });

  it("flags a composed object pushed below the floor and lifts it to y=0", () => {
    let s = createEmptyScene();
    s = addObject(s, "chair");
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, -1, 0] } }); // base at -1
    const below = verifyGeometry(s).find((i) => i.kind === "below_floor");
    expect(below).toBeTruthy();
    expect(below!.fix!.patch.transform!.position![1]).toBeCloseTo(0);
  });

  it("isBottomAnchored: primitives center-anchored, composed/group bottom-anchored", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    s = addObject(s, "desk");
    s = addObject(s, "group");
    expect(isBottomAnchored(s.objects[0])).toBe(false); // cube (primitive)
    expect(isBottomAnchored(s.objects[1])).toBe(true); // desk (composed)
    expect(isBottomAnchored(s.objects[2])).toBe(true); // group
  });
});
