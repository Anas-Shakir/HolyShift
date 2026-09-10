import { z } from "zod";
import {
  ObjectTypeSchema,
  LightTypeSchema,
  Vec3Schema,
  HexColorSchema,
  PrimitiveTypeSchema,
} from "@/lib/scene/schema";

/**
 * ScenePatch — the machine-readable output contract for the AI Scene Agent.
 *
 * The agent returns a list of typed operations (create/update/delete/environment/lights)
 * plus an optional clarification. Every field is expressed in terms of the capability
 * manifest, so the agent can never request something the renderer/compiler can't build.
 *
 * Zod is the validation source of truth here (mirrors patchSchema.ts, the JSON Schema used
 * for Groq structured output).
 */

/** A target reference for update/delete: by explicit id, or by type + optional ordinal. */
export const TargetSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ type: ObjectTypeSchema, ordinal: z.number().int().min(1).optional() }),
]);
export type Target = z.infer<typeof TargetSchema>;

/** Editable material fields (all optional; partial patch). */
export const MaterialPatchSchema = z
  .object({
    color: HexColorSchema.optional(),
    metalness: z.number().min(0).max(1).optional(),
    roughness: z.number().min(0).max(1).optional(),
    opacity: z.number().min(0).max(1).optional(),
    emissiveIntensity: z.number().min(0).optional(),
  })
  .strict();

/** A group child the AI may specify when creating a `group` object. */
export const CreateChildSchema = z
  .object({
    type: PrimitiveTypeSchema,
    position: Vec3Schema,
    rotation: Vec3Schema.optional(),
    dimensions: Vec3Schema,
    material: MaterialPatchSchema.optional(),
  })
  .strict();

/** Fields the AI may set when creating an object. */
export const CreateObjectSchema = z
  .object({
    type: ObjectTypeSchema,
    name: z.string().min(1).optional(),
    position: Vec3Schema.optional(),
    rotation: Vec3Schema.optional(),
    scale: Vec3Schema.optional(),
    dimensions: Vec3Schema.optional(),
    material: MaterialPatchSchema.optional(),
    /** For type "group": the primitive children to assemble. */
    children: z.array(CreateChildSchema).optional(),
  })
  .strict();

/** Fields the AI may change on an existing object. */
export const UpdateChangesSchema = z
  .object({
    name: z.string().min(1).optional(),
    position: Vec3Schema.optional(),
    rotation: Vec3Schema.optional(),
    scale: Vec3Schema.optional(),
    dimensions: Vec3Schema.optional(),
    material: MaterialPatchSchema.optional(),
  })
  .strict();

export const EnvironmentPatchSchema = z
  .object({
    backgroundColor: HexColorSchema.optional(),
    ambientIntensity: z.number().min(0).optional(),
  })
  .strict();

export const LightPatchSchema = z
  .object({
    type: LightTypeSchema,
    color: HexColorSchema,
    intensity: z.number().min(0),
    position: Vec3Schema,
  })
  .strict();

/** Discriminated union of operations on `op`. */
export const OperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create"), object: CreateObjectSchema }),
  z.object({ op: z.literal("update"), target: TargetSchema, changes: UpdateChangesSchema }),
  z.object({ op: z.literal("delete"), target: TargetSchema }),
  z.object({ op: z.literal("setEnvironment"), changes: EnvironmentPatchSchema }),
  z.object({ op: z.literal("addLight"), light: LightPatchSchema }),
  z.object({ op: z.literal("removeLight"), id: z.string().min(1) }),
]);
export type Operation = z.infer<typeof OperationSchema>;

/** The full patch: operations plus an optional clarification request. */
export const ScenePatchSchema = z.object({
  operations: z.array(OperationSchema),
  clarification: z.string().optional(),
});
export type ScenePatch = z.infer<typeof ScenePatchSchema>;
