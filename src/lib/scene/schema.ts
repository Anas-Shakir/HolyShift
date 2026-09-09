import { z } from "zod";

/**
 * Canonical structured scene schema — the single source of truth for the world.
 *
 * Zod is the source of validation truth; all TypeScript types are derived from
 * these schemas via `z.infer`. The browser Zustand store, the 3D preview (Spec 2),
 * the AI Scene Agent output schema (Spec 3), and the Blender compiler (Spec 4) all
 * share this contract.
 *
 * Design notes:
 * - Vectors are plain 3-tuples `[x, y, z]` for direct React Three Fiber / Three.js use.
 * - Colors are hex strings for use in both CSS and Three.js.
 * - The set of object types is CLOSED (an enum). This closed set is the seed of the
 *   capability manifest that keeps the AI and the Blender compiler in lockstep.
 */

/** Bumped when the schema shape changes in a breaking way (see serialize.ts). */
export const SCHEMA_VERSION = 1 as const;

/** A 3-component vector `[x, y, z]`. */
export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

/** Hex color like `#7c5cff` (3- or 6-digit). */
export const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color like #rrggbb");
export type HexColor = z.infer<typeof HexColorSchema>;

/**
 * Supported object types (closed set = capability manifest seed).
 * - Core primitives: cube, sphere, cylinder, plane.
 * - Composed objects: represented as groups of primitives by the renderer/compiler.
 */
export const ObjectTypeSchema = z.enum([
  // core primitives
  "cube",
  "sphere",
  "cylinder",
  "plane",
  // composed objects
  "chair",
  "desk",
  "table",
  "monitor",
  "pc",
  "lamp",
]);
export type ObjectType = z.infer<typeof ObjectTypeSchema>;

/** Object transform: position, rotation (Euler radians), and scale. */
export const TransformSchema = z.object({
  position: Vec3Schema,
  rotation: Vec3Schema,
  scale: Vec3Schema,
});
export type Transform = z.infer<typeof TransformSchema>;

/** PBR-ish material description shared by preview and Blender. */
export const MaterialSchema = z.object({
  color: HexColorSchema,
  metalness: z.number().min(0).max(1),
  roughness: z.number().min(0).max(1),
  /** 0 = fully transparent, 1 = fully opaque. */
  opacity: z.number().min(0).max(1).default(1),
  /** Emissive strength for neon/glow looks (0 = none). */
  emissiveIntensity: z.number().min(0).default(0),
});
export type Material = z.infer<typeof MaterialSchema>;

/** A single entity in the world. */
export const SceneObjectSchema = z.object({
  /** Stable, human-readable, unique id, e.g. "chair_01". */
  id: z.string().min(1),
  type: ObjectTypeSchema,
  /** Display name; may differ from id. */
  name: z.string().min(1),
  transform: TransformSchema,
  /** Base dimensions `[width, height, depth]` in scene units before scale. */
  dimensions: Vec3Schema,
  material: MaterialSchema,
  /** Optional parent object id, for grouping/relationships. */
  parentId: z.string().min(1).optional(),
});
export type SceneObject = z.infer<typeof SceneObjectSchema>;

/** Supported light types. */
export const LightTypeSchema = z.enum(["point", "directional", "ambient", "spot"]);
export type LightType = z.infer<typeof LightTypeSchema>;

/** A light in the scene. */
export const LightSchema = z.object({
  id: z.string().min(1),
  type: LightTypeSchema,
  color: HexColorSchema,
  intensity: z.number().min(0),
  position: Vec3Schema,
});
export type Light = z.infer<typeof LightSchema>;

/** The scene camera. */
export const CameraSchema = z.object({
  position: Vec3Schema,
  /** Point the camera looks at. */
  target: Vec3Schema,
  /** Vertical field of view in degrees. */
  fov: z.number().min(1).max(179),
});
export type Camera = z.infer<typeof CameraSchema>;

/** Global environment / world settings. */
export const EnvironmentSchema = z.object({
  backgroundColor: HexColorSchema,
  /** Ambient light intensity floor for the whole scene. */
  ambientIntensity: z.number().min(0),
});
export type Environment = z.infer<typeof EnvironmentSchema>;

/** Scene metadata, including the schema version for forward-compatibility. */
export const SceneMetadataSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  name: z.string().default("Untitled Scene"),
  /** ISO timestamp of creation. */
  createdAt: z.string(),
});
export type SceneMetadata = z.infer<typeof SceneMetadataSchema>;

/** The complete structured world — the canonical source of truth. */
export const SceneSchema = z.object({
  metadata: SceneMetadataSchema,
  objects: z.array(SceneObjectSchema),
  lights: z.array(LightSchema),
  camera: CameraSchema,
  environment: EnvironmentSchema,
});
export type Scene = z.infer<typeof SceneSchema>;

/** Convenience: list of all supported object types (for UI/manifests/tests). */
export const OBJECT_TYPES = ObjectTypeSchema.options;
/** Convenience: list of all supported light types. */
export const LIGHT_TYPES = LightTypeSchema.options;
