import { describe, it, expect } from "vitest";
import {
  toMaterialProps,
  boxArgs,
  sphereRadius,
  cylinderArgs,
  planeArgs,
  isPrimitive,
  PRIMITIVE_TYPES,
  COMPOSED_TYPES,
} from "./mapping";
import { RENDERERS } from "./SceneObjectView";
import { OBJECT_TYPES, type Material, type Vec3 } from "@/lib/scene/schema";

const baseMaterial: Material = {
  color: "#3366cc",
  metalness: 0.2,
  roughness: 0.7,
  opacity: 1,
  emissiveIntensity: 0,
};

describe("toMaterialProps", () => {
  it("maps a solid material", () => {
    const p = toMaterialProps(baseMaterial);
    expect(p.color).toBe("#3366cc");
    expect(p.transparent).toBe(false);
    expect(p.emissive).toBe("#000000");
  });

  it("marks transparent when opacity < 1", () => {
    expect(toMaterialProps({ ...baseMaterial, opacity: 0.5 }).transparent).toBe(true);
  });

  it("emits object color when emissiveIntensity > 0", () => {
    const p = toMaterialProps({ ...baseMaterial, emissiveIntensity: 2 });
    expect(p.emissive).toBe("#3366cc");
    expect(p.emissiveIntensity).toBe(2);
  });
});

describe("geometry arg helpers", () => {
  const dims: Vec3 = [2, 3, 4];
  it("boxArgs passes dimensions through", () => {
    expect(boxArgs(dims)).toEqual([2, 3, 4]);
  });
  it("sphereRadius uses half the largest extent", () => {
    expect(sphereRadius(dims)).toBe(2);
  });
  it("cylinderArgs uses max(x,z)/2 radius and y height", () => {
    const [rt, rb, h, seg] = cylinderArgs(dims);
    expect(rt).toBe(2);
    expect(rb).toBe(2);
    expect(h).toBe(3);
    expect(seg).toBeGreaterThan(0);
  });
  it("planeArgs enforces a minimum thickness", () => {
    const [w, t, d] = planeArgs([4, 0, 4]);
    expect(w).toBe(4);
    expect(d).toBe(4);
    expect(t).toBeGreaterThan(0);
  });
});

describe("type classification", () => {
  it("primitive/composed lists are disjoint and cover all types", () => {
    const union = [...PRIMITIVE_TYPES, ...COMPOSED_TYPES].sort();
    expect(union).toEqual([...OBJECT_TYPES].sort());
  });
  it("isPrimitive is correct", () => {
    expect(isPrimitive("cube")).toBe(true);
    expect(isPrimitive("desk")).toBe(false);
  });
});

describe("renderer dispatch table", () => {
  it("has a renderer for EVERY object type (no missing case)", () => {
    for (const type of OBJECT_TYPES) {
      expect(RENDERERS[type], `missing renderer for ${type}`).toBeTypeOf("function");
    }
  });
});
