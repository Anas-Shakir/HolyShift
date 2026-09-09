import { describe, it, expect } from "vitest";
import { makeId, makeLightId } from "./ids";

describe("makeId", () => {
  it("starts at 01 for an empty set", () => {
    expect(makeId("chair", [])).toBe("chair_01");
  });

  it("increments per type without collisions", () => {
    const ids: string[] = [];
    ids.push(makeId("monitor", ids));
    ids.push(makeId("monitor", ids));
    ids.push(makeId("monitor", ids));
    expect(ids).toEqual(["monitor_01", "monitor_02", "monitor_03"]);
    expect(new Set(ids).size).toBe(3);
  });

  it("scopes ordinals per type", () => {
    const ids = ["chair_01", "desk_01"];
    expect(makeId("chair", ids)).toBe("chair_02");
    expect(makeId("desk", ids)).toBe("desk_02");
    expect(makeId("monitor", ids)).toBe("monitor_01");
  });

  it("fills the lowest free ordinal after a removal", () => {
    // chair_02 removed; next chair should reuse the freed slot 02
    const ids = ["chair_01", "chair_03"];
    expect(makeId("chair", ids)).toBe("chair_02");
  });

  it("never collides across many adds and removes", () => {
    let ids: string[] = [];
    for (let i = 0; i < 50; i++) ids.push(makeId("cube", ids));
    expect(new Set(ids).size).toBe(50);
    // remove every other one, then re-add; still unique
    ids = ids.filter((_, i) => i % 2 === 0);
    for (let i = 0; i < 25; i++) ids.push(makeId("cube", ids));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("makeLightId", () => {
  it("produces light_NN", () => {
    expect(makeLightId([])).toBe("light_01");
    expect(makeLightId(["light_01"])).toBe("light_02");
  });
});
