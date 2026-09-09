/**
 * JSON Schema for Groq structured output (response_format json_schema, strict: true).
 *
 * This mirrors patch.ts (the Zod source of truth). Groq's strict/constrained decoding has
 * requirements that differ from Zod, so this is authored by hand rather than auto-derived:
 *   - every object sets additionalProperties: false,
 *   - every property is listed in `required`,
 *   - "optional" fields are expressed as nullable (type includes "null"); the model emits
 *     null when it has no value, and the route strips nulls before Zod validation.
 *
 * Keep this in sync with patch.ts. A test asserts a representative round-trip.
 */

const vec3 = {
  type: "array",
  items: { type: "number" },
  minItems: 3,
  maxItems: 3,
} as const;

const materialPatch = {
  type: "object",
  additionalProperties: false,
  properties: {
    color: { type: ["string", "null"] },
    metalness: { type: ["number", "null"] },
    roughness: { type: ["number", "null"] },
    opacity: { type: ["number", "null"] },
    emissiveIntensity: { type: ["number", "null"] },
  },
  required: ["color", "metalness", "roughness", "opacity", "emissiveIntensity"],
} as const;

// Target as a single object with nullable alternatives (id OR type[+ordinal]).
const target = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: ["string", "null"] },
    type: { type: ["string", "null"] },
    ordinal: { type: ["number", "null"] },
  },
  required: ["id", "type", "ordinal"],
} as const;

const createObject = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string" },
    name: { type: ["string", "null"] },
    position: { anyOf: [vec3, { type: "null" }] },
    rotation: { anyOf: [vec3, { type: "null" }] },
    scale: { anyOf: [vec3, { type: "null" }] },
    dimensions: { anyOf: [vec3, { type: "null" }] },
    material: { anyOf: [materialPatch, { type: "null" }] },
  },
  required: ["type", "name", "position", "rotation", "scale", "dimensions", "material"],
} as const;

const updateChanges = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: ["string", "null"] },
    position: { anyOf: [vec3, { type: "null" }] },
    rotation: { anyOf: [vec3, { type: "null" }] },
    scale: { anyOf: [vec3, { type: "null" }] },
    dimensions: { anyOf: [vec3, { type: "null" }] },
    material: { anyOf: [materialPatch, { type: "null" }] },
  },
  required: ["name", "position", "rotation", "scale", "dimensions", "material"],
} as const;

const environmentPatch = {
  type: "object",
  additionalProperties: false,
  properties: {
    backgroundColor: { type: ["string", "null"] },
    ambientIntensity: { type: ["number", "null"] },
  },
  required: ["backgroundColor", "ambientIntensity"],
} as const;

const lightPatch = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string" },
    color: { type: "string" },
    intensity: { type: "number" },
    position: vec3,
  },
  required: ["type", "color", "intensity", "position"],
} as const;

// An operation carries all possible fields; unused ones are null. The route narrows by "op".
const operation = {
  type: "object",
  additionalProperties: false,
  properties: {
    op: {
      type: "string",
      enum: ["create", "update", "delete", "setEnvironment", "addLight", "removeLight"],
    },
    object: { anyOf: [createObject, { type: "null" }] },
    target: { anyOf: [target, { type: "null" }] },
    changes: { anyOf: [updateChanges, environmentPatch, { type: "null" }] },
    light: { anyOf: [lightPatch, { type: "null" }] },
    id: { type: ["string", "null"] },
  },
  required: ["op", "object", "target", "changes", "light", "id"],
} as const;

export const SCENE_PATCH_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    operations: { type: "array", items: operation },
    clarification: { type: ["string", "null"] },
  },
  required: ["operations", "clarification"],
} as const;

export const SCENE_PATCH_SCHEMA_NAME = "scene_patch";
