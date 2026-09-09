import { describe, it, expect } from "vitest";
import {
  SceneSchema,
  SceneObjectSchema,
  MaterialSchema,
  HexColorSchema,
  TransformSchema,
  SCHEMA_VERSION,
  OBJECT_TYPES,
} from "./schema";

const validObject = {
  id: "cube_01",
  type: "cube",
  name: "Cube",
  transform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  dimensions: [1, 1, 1],
  material: {
    color: "#ffffff",
    metalness: 0,
    roughness: 0.5,
    opacity: 1,
    emissiveIntensity: 0,
  },
};

const validScene = {
  metadata: {
    version: SCHEMA_VERSION,
    name: "Test Scene",
    createdAt: new Date().toISOString(),
  },
  objects: [validObject],
  lights: [
    {
      id: "light_01",
      type: "point",
      color: "#ffffff",
      intensity: 1,
      position: [2, 4, 2],
    },
  ],
  camera: { position: [5, 5, 5], target: [0, 0, 0], fov: 50 },
  environment: { backgroundColor: "#0d0f14", ambientIntensity: 0.3 },
};

describe("HexColorSchema", () => {
  it("accepts 3- and 6-digit hex", () => {
    expect(HexColorSchema.safeParse("#fff").success).toBe(true);
    expect(HexColorSchema.safeParse("#7c5cff").success).toBe(true);
  });
  it("rejects non-hex", () => {
    expect(HexColorSchema.safeParse("red").success).toBe(false);
    expect(HexColorSchema.safeParse("#gggggg").success).toBe(false);
    expect(HexColorSchema.safeParse("7c5cff").success).toBe(false);
  });
});

describe("TransformSchema", () => {
  it("requires 3-tuples", () => {
    expect(
      TransformSchema.safeParse({ position: [0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] })
        .success,
    ).toBe(false);
  });
});

describe("MaterialSchema", () => {
  it("clamps metalness/roughness to 0..1", () => {
    expect(MaterialSchema.safeParse({ color: "#fff", metalness: 2, roughness: 0.5 }).success).toBe(
      false,
    );
  });
  it("defaults opacity and emissiveIntensity", () => {
    const parsed = MaterialSchema.parse({ color: "#fff", metalness: 0, roughness: 0.5 });
    expect(parsed.opacity).toBe(1);
    expect(parsed.emissiveIntensity).toBe(0);
  });
});

describe("SceneObjectSchema", () => {
  it("accepts a valid object", () => {
    expect(SceneObjectSchema.safeParse(validObject).success).toBe(true);
  });
  it("rejects unknown type", () => {
    const bad = { ...validObject, type: "teapot" };
    expect(SceneObjectSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects missing id", () => {
    const { id: _omit, ...bad } = validObject;
    expect(SceneObjectSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects malformed transform", () => {
    const bad = { ...validObject, transform: { position: [0, 0, 0], scale: [1, 1, 1] } };
    expect(SceneObjectSchema.safeParse(bad).success).toBe(false);
  });
});

describe("SceneSchema", () => {
  it("accepts a valid scene", () => {
    const result = SceneSchema.safeParse(validScene);
    expect(result.success).toBe(true);
  });
  it("rejects a scene with a wrong schema version", () => {
    const bad = { ...validScene, metadata: { ...validScene.metadata, version: 999 } };
    expect(SceneSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects a scene missing the camera", () => {
    const { camera: _omit, ...bad } = validScene;
    expect(SceneSchema.safeParse(bad).success).toBe(false);
  });
  it("produces a useful error path for a bad nested field", () => {
    const bad = {
      ...validScene,
      objects: [{ ...validObject, material: { ...validObject.material, color: "notacolor" } }],
    };
    const result = SceneSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const path = result.error.issues[0]?.path.join(".");
      expect(path).toContain("objects.0.material.color");
    }
  });
});

describe("OBJECT_TYPES", () => {
  it("includes the core primitives", () => {
    expect(OBJECT_TYPES).toEqual(expect.arrayContaining(["cube", "sphere", "cylinder", "plane"]));
  });
});
