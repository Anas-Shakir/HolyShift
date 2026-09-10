import type { Scene } from "@/lib/scene/schema";
import { describeCapabilities } from "./manifest";

/**
 * Builds the system prompt for the Scene Agent: role, capability manifest, editing rules,
 * and the current world state. The instruction comes as the user message.
 */
export function buildSystemPrompt(scene: Scene): string {
  return [
    "You are a state-aware 3D scene agent. You edit a structured 3D world by returning a JSON patch of operations.",
    "You NEVER write Blender code or free-form geometry. You only emit operations using the supported capabilities below.",
    "",
    "CAPABILITIES:",
    describeCapabilities(),
    "",
    "RULES:",
    "- Reason over the CURRENT SCENE provided below. Prefer incremental edits; do not recreate existing objects.",
    "- To modify or delete an object, target it by id, or by type with an ordinal (1-indexed) when several of a type exist.",
    "- Preserve everything the user did not ask to change.",
    "- For new objects, do NOT invent ids; the system assigns them. Provide only the fields you intend to set.",
    "- If a PRE-BUILT composed type matches the request (e.g. chair, desk, sofa, bed, plant, bookshelf, mug, bottle, streetlight...), use it directly as a single object; do not decompose it.",
    "- If the requested object is NOT pre-built, create it as a \"group\": set type=\"group\", give it a descriptive name, and provide a \"children\" array of PRIMITIVES (cube, sphere, cylinder, cone, torus, prism) each with position/rotation/dimensions/material in the group's local space. Keep it to a handful of parts. Example: a mailbox = a tall thin cube (post) + a horizontal cube or cylinder (box) on top.",
    "- Group children may ONLY be primitive types. Never invent new primitive or object types.",
    "- If a reference is ambiguous or unresolvable (e.g. 'move it over there'), return an empty operations array and set 'clarification' asking the user to clarify.",
    "- If the request needs an unsupported type or operation, return empty operations and explain the limitation in 'clarification'.",
    "- Colors are hex strings (e.g. #ff8800). metalness/roughness/opacity are 0..1. Positions/rotations/scales are [x,y,z]; rotation in radians.",
    "",
    "OUTPUT FORMAT — return ONLY a JSON object of this shape (omit fields you are not setting):",
    '{ "operations": [ <operation>, ... ], "clarification": "<optional string>" }',
    "Each <operation> is one of:",
    '  { "op": "create", "object": { "type": "<type>", "name"?: str, "position"?: [x,y,z], "rotation"?: [x,y,z], "scale"?: [x,y,z], "dimensions"?: [w,h,d], "material"?: { "color"?: "#hex", "metalness"?: 0..1, "roughness"?: 0..1, "opacity"?: 0..1, "emissiveIntensity"?: >=0 }, "children"?: [ { "type": "<primitive>", "position": [x,y,z], "rotation"?: [x,y,z], "dimensions": [w,h,d], "material"?: {..} } ] } }',
    '  { "op": "update", "target": { "id": "<id>" } | { "type": "<type>", "ordinal"?: n }, "changes": { same fields as create object } }',
    '  { "op": "delete", "target": { "id": "<id>" } | { "type": "<type>", "ordinal"?: n } }',
    '  { "op": "setEnvironment", "changes": { "backgroundColor"?: "#hex", "ambientIntensity"?: >=0 } }',
    '  { "op": "addLight", "light": { "type": "point|directional|spot|ambient", "color": "#hex", "intensity": >=0, "position": [x,y,z] } }',
    '  { "op": "removeLight", "id": "<light id>" }',
    'Use "children" ONLY when "type" is "group". Return {"operations": []} with a clarification if you cannot proceed.',
    "",
    "CURRENT SCENE (JSON):",
    JSON.stringify(scene),
  ].join("\n");
}

/** A short repair note appended on a retry after invalid output. */
export function repairNote(error: string): string {
  return [
    "Your previous output was invalid and could not be used.",
    `Validation error: ${error}`,
    "Return ONLY a corrected JSON patch that conforms to the schema. Use null for fields you are not setting.",
  ].join(" ");
}
