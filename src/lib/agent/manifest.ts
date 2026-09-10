import {
  OBJECT_TYPES,
  LIGHT_TYPES,
  PRIMITIVE_TYPES,
  COMPOSED_TYPES,
  type ObjectType,
  type LightType,
  type PrimitiveType,
} from "@/lib/scene/schema";

/**
 * Capability manifest — the single closed contract of what the AI Scene Agent may produce.
 *
 * It is DERIVED from the Spec 1 schema (OBJECT_TYPES / LIGHT_TYPES), so the AI's output
 * schema, the browser renderer (Spec 2), and the Blender compiler (Spec 4) all stay in
 * lockstep. If a new type is added to the schema, it flows here automatically and a test
 * asserts they never drift apart.
 */

export interface Capabilities {
  objectTypes: readonly ObjectType[];
  /** The primitive subset (also the only types a group's children may use). */
  primitiveTypes: readonly PrimitiveType[];
  /** Seeded pre-built composed objects. */
  composedTypes: readonly ObjectType[];
  lightTypes: readonly LightType[];
  /** Editable material fields the AI may set. */
  materialFields: readonly string[];
  /** Editable environment fields the AI may set. */
  environmentFields: readonly string[];
}

export const CAPABILITIES: Capabilities = {
  objectTypes: OBJECT_TYPES,
  primitiveTypes: PRIMITIVE_TYPES,
  composedTypes: COMPOSED_TYPES,
  lightTypes: LIGHT_TYPES,
  materialFields: ["color", "metalness", "roughness", "opacity", "emissiveIntensity"],
  environmentFields: ["backgroundColor", "ambientIntensity"],
};

/** Human-readable manifest description injected into the system prompt. */
export function describeCapabilities(): string {
  return [
    `Primitive types: ${CAPABILITIES.primitiveTypes.join(", ")}.`,
    `Pre-built composed objects (use these when they match the request): ${CAPABILITIES.composedTypes.join(", ")}.`,
    `Free composition: use type "group" with a "children" array of primitives to build ANY object that is not pre-built (e.g. a potted plant = cylinder pot + sphere foliage). Group children may ONLY be primitive types, each with its own position/rotation/dimensions/material in the group's local space.`,
    `Supported light types: ${CAPABILITIES.lightTypes.join(", ")}.`,
    `Editable material fields: ${CAPABILITIES.materialFields.join(", ")} (color is a hex string like #ff8800; metalness/roughness/opacity are 0..1; emissiveIntensity >= 0).`,
    `Editable environment fields: ${CAPABILITIES.environmentFields.join(", ")}.`,
    `Transforms use position/rotation/scale as [x, y, z]; rotation is in radians. Dimensions are [width, height, depth]. Up axis is Y.`,
  ].join("\n");
}
