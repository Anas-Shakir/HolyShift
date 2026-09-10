import {
  SceneSchema,
  SceneObjectSchema,
  SCHEMA_VERSION,
  type Scene,
  type SceneObject,
  type ObjectType,
  type Material,
  type Vec3,
} from "./schema";
import { makeId } from "./ids";

/**
 * Factories for building schema-valid scenes and objects with sensible defaults.
 *
 * These are the ONLY blessed way to construct new state, so every object entering the
 * world is valid by construction. The state operations (Task 4) build on these.
 */

/** Neutral default material. */
function defaultMaterial(color = "#b8bec9"): Material {
  return { color, metalness: 0, roughness: 0.6, opacity: 1, emissiveIntensity: 0 };
}

/** Identity transform at the origin. */
function identityTransform() {
  return {
    position: [0, 0, 0] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    scale: [1, 1, 1] as Vec3,
  };
}

/** Per-type default dimensions `[w, h, d]` and a starting color. */
const TYPE_DEFAULTS: Record<ObjectType, { dimensions: Vec3; color: string; label: string }> = {
  // primitives
  cube: { dimensions: [1, 1, 1], color: "#b8bec9", label: "Cube" },
  sphere: { dimensions: [1, 1, 1], color: "#b8bec9", label: "Sphere" },
  cylinder: { dimensions: [1, 1, 1], color: "#b8bec9", label: "Cylinder" },
  plane: { dimensions: [4, 0.02, 4], color: "#3a3f4b", label: "Plane" },
  cone: { dimensions: [1, 1, 1], color: "#b8bec9", label: "Cone" },
  torus: { dimensions: [1, 0.4, 1], color: "#b8bec9", label: "Torus" },
  prism: { dimensions: [1, 1, 1], color: "#b8bec9", label: "Prism" },
  // free composition
  group: { dimensions: [1, 1, 1], color: "#b8bec9", label: "Group" },
  // seeded composed objects
  chair: { dimensions: [0.5, 1, 0.5], color: "#5a4636", label: "Chair" },
  desk: { dimensions: [1.6, 0.75, 0.7], color: "#6b4f34", label: "Desk" },
  table: { dimensions: [1.4, 0.75, 0.9], color: "#6b4f34", label: "Table" },
  monitor: { dimensions: [0.6, 0.4, 0.05], color: "#1b1e26", label: "Monitor" },
  pc: { dimensions: [0.25, 0.5, 0.5], color: "#14161c", label: "PC" },
  lamp: { dimensions: [0.2, 0.6, 0.2], color: "#d9c27a", label: "Lamp" },
  plant: { dimensions: [0.5, 0.9, 0.5], color: "#3f7d3a", label: "Plant" },
  bookshelf: { dimensions: [1.2, 1.8, 0.3], color: "#6b4f34", label: "Bookshelf" },
  sofa: { dimensions: [2, 0.8, 0.9], color: "#4a5568", label: "Sofa" },
  bed: { dimensions: [1.6, 0.5, 2], color: "#8a8f9c", label: "Bed" },
  rug: { dimensions: [2, 0.02, 1.4], color: "#8a4b3c", label: "Rug" },
  window: { dimensions: [1.2, 1.4, 0.1], color: "#9fb7c9", label: "Window" },
  door: { dimensions: [0.9, 2, 0.08], color: "#6b4f34", label: "Door" },
  mug: { dimensions: [0.25, 0.3, 0.25], color: "#d0d4da", label: "Mug" },
  bottle: { dimensions: [0.18, 0.5, 0.18], color: "#2f6b4f", label: "Bottle" },
  stool: { dimensions: [0.4, 0.5, 0.4], color: "#5a4636", label: "Stool" },
  streetlight: { dimensions: [0.2, 3, 0.2], color: "#3a3f4b", label: "Streetlight" },
};

/**
 * Default children for a bare `group` so a group is always schema-valid on creation.
 * The AI normally supplies its own children; this is the fallback (a simple two-part prop).
 */
function defaultGroupChildren() {
  return [
    {
      type: "cylinder" as const,
      position: [0, 0.15, 0] as Vec3,
      rotation: [0, 0, 0] as Vec3,
      dimensions: [0.3, 0.3, 0.3] as Vec3,
      material: defaultMaterial("#8b5a2b"),
    },
    {
      type: "sphere" as const,
      position: [0, 0.5, 0] as Vec3,
      rotation: [0, 0, 0] as Vec3,
      dimensions: [0.5, 0.5, 0.5] as Vec3,
      material: defaultMaterial("#3f7d3a"),
    },
  ];
}

/**
 * Create a schema-valid default object of `type`, with a stable id that does not
 * collide with `existingIds`.
 */
export function createDefaultObject(
  type: ObjectType,
  existingIds: Iterable<string> = [],
  overrides: Partial<Omit<SceneObject, "id" | "type">> = {},
): SceneObject {
  const defaults = TYPE_DEFAULTS[type];
  const id = makeId(type, existingIds);
  const baseTransform = identityTransform();
  const candidate: SceneObject = {
    id,
    type,
    name: overrides.name ?? defaults.label,
    // Deep-merge transform/material overrides onto defaults so partial patches are valid.
    transform: { ...baseTransform, ...(overrides.transform ?? {}) },
    dimensions: overrides.dimensions ?? defaults.dimensions,
    material: { ...defaultMaterial(defaults.color), ...(overrides.material ?? {}) },
    ...(overrides.parentId ? { parentId: overrides.parentId } : {}),
    // Groups carry children; the AI usually supplies them, else a sensible default.
    ...(type === "group"
      ? { children: overrides.children ?? defaultGroupChildren() }
      : {}),
  };
  // Validate by construction — throws if defaults ever drift from the schema.
  return SceneObjectSchema.parse(candidate);
}

/** Create a valid, empty scene with a default camera and environment. */
export function createEmptyScene(name = "Untitled Scene"): Scene {
  const scene: Scene = {
    metadata: {
      version: SCHEMA_VERSION,
      name,
      createdAt: new Date().toISOString(),
    },
    objects: [],
    lights: [],
    camera: { position: [6, 5, 6], target: [0, 0.5, 0], fov: 50 },
    environment: { backgroundColor: "#0d0f14", ambientIntensity: 0.35 },
  };
  return SceneSchema.parse(scene);
}
