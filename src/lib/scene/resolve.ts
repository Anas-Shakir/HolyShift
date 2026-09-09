import type { Scene, SceneObject, ObjectType } from "./schema";

/**
 * Reference resolution helpers.
 *
 * These let callers (and, later, the AI Scene Agent in Spec 3) resolve references like
 * "the chair" or "the second monitor" against the current world. Ordinals are 1-indexed
 * and follow object insertion order, matching how a user counts ("first", "second").
 */

/** Find an object by its exact id. Returns undefined if absent. */
export function byId(scene: Scene, id: string): SceneObject | undefined {
  return scene.objects.find((o) => o.id === id);
}

/** All objects of a given type, in insertion order. */
export function byType(scene: Scene, type: ObjectType): SceneObject[] {
  return scene.objects.filter((o) => o.type === type);
}

/**
 * The nth object of a type (1-indexed): byOrdinal(scene, "monitor", 2) → second monitor.
 * Returns undefined if there is no such object.
 */
export function byOrdinal(
  scene: Scene,
  type: ObjectType,
  ordinal: number,
): SceneObject | undefined {
  if (ordinal < 1) return undefined;
  return byType(scene, type)[ordinal - 1];
}

/** True if exactly one object of the given type exists (safe to say "the X"). */
export function isUnambiguous(scene: Scene, type: ObjectType): boolean {
  return byType(scene, type).length === 1;
}
