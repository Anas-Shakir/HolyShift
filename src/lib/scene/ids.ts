import type { ObjectType } from "./schema";

/**
 * Stable, human-readable id generation.
 *
 * IDs look like `chair_01`, `monitor_02`. Readable, per-type ordinals help the future
 * AI agent resolve references such as "the second monitor" (Spec 3), and make the
 * object panel / JSON inspector easy to scan.
 *
 * Collision-safe: given the set of existing ids, we pick the lowest free ordinal for
 * the requested type, so removing and re-adding never produces a duplicate id.
 */

const ORDINAL_PAD = 2;

/** Extract the numeric ordinal from an id like `monitor_02` for a given prefix. */
function ordinalFor(prefix: string, id: string): number | null {
  if (!id.startsWith(`${prefix}_`)) return null;
  const suffix = id.slice(prefix.length + 1);
  if (!/^\d+$/.test(suffix)) return null;
  return Number.parseInt(suffix, 10);
}

/**
 * Generate the next stable id for `type`, avoiding collisions with `existingIds`.
 * @param type object type used as the id prefix
 * @param existingIds ids already present in the scene
 */
export function makeId(type: ObjectType | string, existingIds: Iterable<string>): string {
  const used = new Set<number>();
  for (const id of existingIds) {
    const n = ordinalFor(type, id);
    if (n !== null) used.add(n);
  }
  let next = 1;
  while (used.has(next)) next += 1;
  return `${type}_${String(next).padStart(ORDINAL_PAD, "0")}`;
}

/** Generate a unique id for a light, e.g. `light_01`. */
export function makeLightId(existingIds: Iterable<string>): string {
  return makeId("light", existingIds);
}
