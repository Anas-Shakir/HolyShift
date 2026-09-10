import type { Scene, SceneObject } from "@/lib/scene/schema";
import type { Issue } from "./types";
import { aabb, baseY, topY, overlaps, footprintOverlaps } from "./boxes";

/**
 * Deterministic geometric verification (the primary tier). Pure: scene in → issues out.
 * Answers placement questions directly from the structured state — no image, no model.
 */

export const FLOOR_Y = 0;
export const SCENE_EXTENT = 50;
export const FLOAT_TOLERANCE = 0.02;
export const OVERLAP_TOLERANCE = 0.05;
export const SUPPORT_GAP = 0.05;
export const MAX_SCALE = 100;

/** Flat, floor-like objects (planes, rugs, thin objects) are exempt from "floating". */
function isFloorLike(object: SceneObject): boolean {
  if (object.type === "plane" || object.type === "rug") return true;
  const box = aabb(object);
  const height = box.max[1] - box.min[1];
  const footprint = Math.max(box.max[0] - box.min[0], box.max[2] - box.min[2]);
  return height < 0.05 || (footprint > 0 && height / footprint < 0.06);
}

/** Does any other object support `object` (its top near object's base, footprints overlap)? */
function hasSupportBeneath(object: SceneObject, others: SceneObject[]): boolean {
  const box = aabb(object);
  const base = box.min[1];
  for (const other of others) {
    if (other.id === object.id) continue;
    const ob = aabb(other);
    if (ob.max[1] <= base + SUPPORT_GAP && ob.max[1] >= base - SUPPORT_GAP) {
      if (footprintOverlaps(box, ob, OVERLAP_TOLERANCE)) return true;
    }
  }
  return false;
}

export function verifyGeometry(scene: Scene): Issue[] {
  const issues: Issue[] = [];
  const objects = scene.objects;

  for (const obj of objects) {
    const box = aabb(obj);

    // --- bad scale / dimensions ---
    const [sx, sy, sz] = obj.transform.scale;
    const badScaleAxis = [sx, sy, sz].findIndex((s) => s <= 0 || s > MAX_SCALE);
    if (badScaleAxis !== -1) {
      const patchScale: [number, number, number] = [sx, sy, sz];
      patchScale[badScaleAxis] = 1;
      issues.push({
        key: `bad_scale:${obj.id}`,
        severity: "error",
        kind: "bad_scale",
        message: `${obj.name} has an invalid scale on the ${["x", "y", "z"][badScaleAxis]} axis.`,
        objectIds: [obj.id],
        fix: { objectId: obj.id, patch: { transform: { scale: patchScale } } },
      });
    }

    // --- below floor ---
    const base = box.min[1];
    if (base < FLOOR_Y - FLOAT_TOLERANCE) {
      const lift = FLOOR_Y - base;
      issues.push({
        key: `below_floor:${obj.id}`,
        severity: "error",
        kind: "below_floor",
        message: `${obj.name} is below the floor.`,
        objectIds: [obj.id],
        fix: {
          objectId: obj.id,
          patch: {
            transform: {
              position: [
                obj.transform.position[0],
                obj.transform.position[1] + lift,
                obj.transform.position[2],
              ],
            },
          },
        },
      });
    } else if (
      // --- floating (above floor, no support) ---
      base > FLOOR_Y + FLOAT_TOLERANCE &&
      !isFloorLike(obj) &&
      !hasSupportBeneath(obj, objects)
    ) {
      // Drop onto the nearest support top below, else the floor.
      let target = FLOOR_Y;
      for (const other of objects) {
        if (other.id === obj.id) continue;
        const ob = aabb(other);
        if (
          ob.max[1] <= base + FLOAT_TOLERANCE &&
          ob.max[1] > target &&
          footprintOverlaps(box, ob, OVERLAP_TOLERANCE)
        ) {
          target = ob.max[1];
        }
      }
      const drop = base - target; // positive
      issues.push({
        key: `floating:${obj.id}`,
        severity: "warning",
        kind: "floating",
        message: `${obj.name} appears to be floating.`,
        objectIds: [obj.id],
        fix: {
          objectId: obj.id,
          patch: {
            transform: {
              position: [
                obj.transform.position[0],
                obj.transform.position[1] - drop,
                obj.transform.position[2],
              ],
            },
          },
        },
      });
    }

    // --- out of bounds ---
    const outAxis = [0, 1, 2].find(
      (i) => Math.abs(box.center[i]) + box.halfExtents[i] > SCENE_EXTENT,
    );
    if (outAxis !== undefined) {
      issues.push({
        key: `out_of_bounds:${obj.id}`,
        severity: "warning",
        kind: "out_of_bounds",
        message: `${obj.name} is far outside the scene bounds.`,
        objectIds: [obj.id],
        // No automatic fix — likely intentional or needs the user.
      });
    }
  }

  // --- interpenetration (unordered pairs) ---
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i];
      const b = objects[j];
      if (isFloorLike(a) || isFloorLike(b)) continue; // things sit ON floors/rugs
      if (overlaps(aabb(a), aabb(b), OVERLAP_TOLERANCE)) {
        issues.push({
          key: `interpenetration:${a.id}:${b.id}`,
          severity: "warning",
          kind: "interpenetration",
          message: `${a.name} and ${b.name} overlap.`,
          objectIds: [a.id, b.id],
          // Reported only; nudging is ambiguous, left to the user/gizmo.
        });
      }
    }
  }

  return issues;
}

// re-export for callers/tests
export { topY, baseY };
