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
    "- Composed objects (chair, desk, table, monitor, pc, lamp) are single objects; do not decompose them into primitives.",
    "- If a reference is ambiguous or unresolvable (e.g. 'move it over there'), return an empty operations array and set 'clarification' asking the user to clarify.",
    "- If the request needs an unsupported type or operation, return empty operations and explain the limitation in 'clarification'.",
    "- Colors are hex strings (e.g. #ff8800). metalness/roughness/opacity are 0..1. Positions/rotations/scales are [x,y,z]; rotation in radians.",
    "- Output ONLY the JSON patch conforming to the provided schema. Fields you are not setting should be null.",
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
