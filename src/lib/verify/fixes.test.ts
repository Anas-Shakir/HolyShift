import { describe, it, expect } from "vitest";
import { applyFix, applyFixes, isFixable } from "./fixes";
import { verifyGeometry } from "./geometry";
import { baseY } from "./boxes";
import { createEmptyScene } from "@/lib/scene/factory";
import { addObject, updateObject } from "@/lib/scene/operations";
import { byId } from "@/lib/scene/resolve";

describe("applyFix", () => {
  it("drops a floating object to the floor", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 5, 0] } });
    const issue = verifyGeometry(s).find((i) => i.kind === "floating")!;
    expect(issue).toBeTruthy();
    const fixed = applyFix(s, issue);
    expect(baseY(byId(fixed, s.objects[0].id)!)).toBeCloseTo(0, 5);
  });

  it("returns the scene unchanged for an issue with no fix", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    const noFix = { key: "x", severity: "warning" as const, kind: "out_of_bounds" as const, message: "", objectIds: [s.objects[0].id] };
    expect(applyFix(s, noFix)).toBe(s);
  });

  it("does not affect unrelated objects", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube"); // floating one
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 5, 0] } });
    s = addObject(s, "chair"); // resting; unrelated
    s = updateObject(s, s.objects[1].id, { transform: { position: [3, 0.5, 0] } });
    const chairBefore = byId(s, s.objects[1].id);
    const issue = verifyGeometry(s).find((i) => i.kind === "floating")!;
    const fixed = applyFix(s, issue);
    expect(byId(fixed, s.objects[1].id)).toEqual(chairBefore);
  });
});

describe("applyFixes", () => {
  it("resolves multiple fixable issues at once", () => {
    let s = createEmptyScene();
    s = addObject(s, "cube");
    s = updateObject(s, s.objects[0].id, { transform: { position: [0, 5, 0] } }); // floating
    s = addObject(s, "sphere");
    s = updateObject(s, s.objects[1].id, { transform: { position: [4, -2, 0] } }); // below floor
    const issues = verifyGeometry(s);
    const fixed = applyFixes(s, issues);
    // after fixing, re-verify finds no floating/below_floor
    const remaining = verifyGeometry(fixed).filter(
      (i) => i.kind === "floating" || i.kind === "below_floor",
    );
    expect(remaining).toHaveLength(0);
  });
});

describe("isFixable", () => {
  it("reflects presence of a fix", () => {
    expect(isFixable({ key: "a", severity: "error", kind: "bad_scale", message: "", objectIds: [], fix: { objectId: "x", patch: {} } })).toBe(true);
    expect(isFixable({ key: "b", severity: "warning", kind: "out_of_bounds", message: "", objectIds: [] })).toBe(false);
  });
});
