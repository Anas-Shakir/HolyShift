import { OBJECT_TYPES, LIGHT_TYPES, type ObjectType, type LightType } from "@/lib/scene/schema";

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
  lightTypes: readonly LightType[];
  /** Editable material fields the AI may set. */
  materialFields: readonly string[];
  /** Editable environment fields the AI may set. */
  environmentFields: readonly string[];
}

export const CAPABILITIES: Capabilities = {
  objectTypes: OBJECT_TYPES,
  lightTypes: LIGHT_TYPES,
  materialFields: ["color", "metalness", "roughness", "opacity", "emissiveIntensity"],
  environmentFields: ["backgroundColor", "ambientIntensity"],
};

/** Human-readable manifest description injected into the system prompt. */
export function describeCapabilities(): string {
  return [
    `Supported object types: ${CAPABILITIES.objectTypes.join(", ")}.`,
    `Supported light types: ${CAPABILITIES.lightTypes.join(", ")}.`,
    `Editable material fields: ${CAPABILITIES.materialFields.join(", ")} (color is a hex string like #ff8800; metalness/roughness/opacity are 0..1; emissiveIntensity >= 0).`,
    `Editable environment fields: ${CAPABILITIES.environmentFields.join(", ")}.`,
    `Transforms use position/rotation/scale as [x, y, z]; rotation is in radians. Dimensions are [width, height, depth].`,
  ].join("\n");
}
