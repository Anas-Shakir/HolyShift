import { describe, it, expect } from "vitest";
import { readTransform } from "./transformCommit";

describe("readTransform", () => {
  it("reads position/rotation/scale into tuple arrays", () => {
    const obj = {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0.1, y: 0.2, z: 0.3 },
      scale: { x: 1.5, y: 2, z: 0.5 },
    };
    expect(readTransform(obj)).toEqual({
      transform: {
        position: [1, 2, 3],
        rotation: [0.1, 0.2, 0.3],
        scale: [1.5, 2, 0.5],
      },
    });
  });
});
