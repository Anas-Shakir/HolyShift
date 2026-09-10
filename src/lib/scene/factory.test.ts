import { describe, it, expect } from "vitest";
import { createEmptyScene, createDefaultObject } from "./factory";
import { SceneSchema, SceneObjectSchema, OBJECT_TYPES, SCHEMA_VERSION } from "./schema";

describe("createEmptyScene", () => {
  it("produces a schema-valid empty scene", () => {
    const scene = createEmptyScene();
    expect(SceneSchema.safeParse(scene).success).toBe(true);
    expect(scene.objects).toHaveLength(0);
    expect(scene.metadata.version).toBe(SCHEMA_VERSION);
  });

  it("uses the provided name", () => {
    expect(createEmptyScene("Cyberpunk").metadata.name).toBe("Cyberpunk");
  });
});

describe("createDefaultObject", () => {
  it("produces a schema-valid object for every supported type", () => {
    for (const type of OBJECT_TYPES) {
      const obj = createDefaultObject(type);
      const result = SceneObjectSchema.safeParse(obj);
      expect(result.success, `type ${type} should be valid`).toBe(true);
      expect(obj.type).toBe(type);
      expect(obj.id.startsWith(`${type}_`)).toBe(true);
    }
  });

  it("assigns collision-safe ids given existing ids", () => {
    const a = createDefaultObject("monitor");
    const b = createDefaultObject("monitor", [a.id]);
    expect(a.id).toBe("monitor_01");
    expect(b.id).toBe("monitor_02");
  });

  it("applies overrides while staying valid", () => {
    const obj = createDefaultObject("cube", [], {
      name: "Red Box",
      material: { color: "#ff0000", metalness: 0, roughness: 0.4, opacity: 1, emissiveIntensity: 0 },
    });
    expect(obj.name).toBe("Red Box");
    expect(obj.material.color).toBe("#ff0000");
    expect(SceneObjectSchema.safeParse(obj).success).toBe(true);
  });

  it("creates a valid group with default children", () => {
    const g = createDefaultObject("group");
    expect(g.type).toBe("group");
    expect(g.children && g.children.length).toBeGreaterThan(0);
    expect(SceneObjectSchema.safeParse(g).success).toBe(true);
  });

  it("creates a group with supplied children", () => {
    const children = [
      {
        type: "cone" as const,
        position: [0, 1, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        dimensions: [0.4, 0.6, 0.4] as [number, number, number],
        material: { color: "#3f7d3a", metalness: 0, roughness: 0.7, opacity: 1, emissiveIntensity: 0 },
      },
    ];
    const g = createDefaultObject("group", [], { name: "Pine", children });
    expect(g.children).toHaveLength(1);
    expect(g.children?.[0].type).toBe("cone");
    expect(SceneObjectSchema.safeParse(g).success).toBe(true);
  });
});
