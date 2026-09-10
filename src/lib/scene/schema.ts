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
 * Base primitive types. These are the shapes the renderer/compiler can draw directly, and
 * the only types a `group`'s children may use. Groups let the AI compose novel objects out
 * of these without any new geometry (Spec 5 — Scene Vocabulary Expansion).
 */
export const PrimitiveTypeSchema = z.enum([
  "cube",
  "sphere",
  "cylinder",
  "plane",
  "cone",
  "torus",
  "prism",
]);
export type PrimitiveType = z.infer<typeof PrimitiveTypeSchema>;

/**
 * Supported object types (closed set = capability manifest seed).
 * - Primitives: cube, sphere, cylinder, plane, cone, torus, prism.
 * - `group`: an AI-composed collection of primitive children (arbitrary novel objects).
 * - Seeded composed objects: recognizable pre-built objects made of primitives.
 */
export const ObjectTypeSchema = z.enum([
  // primitives
  "cube",
  "sphere",
  "cylinder",
  "plane",
  "cone",
  "torus",
  "prism",
  // free composition
  "group",
  // seeded composed objects
  "chair",
  "desk",
  "table",
  "monitor",
  "pc",
  "lamp",
  "plant",
  "bookshelf",
  "sofa",
  "bed",
  "rug",
  "window",
  "door",
  "mug",
  "bottle",
  "stool",
  "streetlight",
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

/**
 * A child sub-shape inside a `group`. Children may only be PRIMITIVES, positioned in the
 * group's local space. This is how the AI builds novel objects (a plant, a sign, a lamp
 * post) out of known parts while the compiler stays deterministic.
 */
export const GroupChildSchema = z.object({
  type: PrimitiveTypeSchema,
  /** Local position relative to the group origin. */
  position: Vec3Schema,
  /** Local rotation (Euler radians). */
  rotation: Vec3Schema.default([0, 0, 0]),
  /** Size `[width, height, depth]`. */
  dimensions: Vec3Schema,
  material: MaterialSchema,
});
export type GroupChild = z.infer<typeof GroupChildSchema>;

/** A single entity in the world. */
export const SceneObjectSchema = z
  .object({
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
    /** Present only for `group` objects: the primitive children to assemble. */
    children: z.array(GroupChildSchema).optional(),
  })
  .superRefine((obj, ctx) => {
    if (obj.type === "group") {
      if (!obj.children || obj.children.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "a group must have a non-empty children array",
          path: ["children"],
        });
      }
    } else if (obj.children !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "only group objects may have children",
        path: ["children"],
      });
    }
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
/** The primitive subset (also the only types a group's children may use). */
export const PRIMITIVE_TYPES = PrimitiveTypeSchema.options;
/** Composed/seeded object types = everything that is not a primitive and not `group`. */
export const COMPOSED_TYPES = OBJECT_TYPES.filter(
  (t) => t !== "group" && !PRIMITIVE_TYPES.includes(t as PrimitiveType),
) as Exclude<ObjectType, PrimitiveType | "group">[];
