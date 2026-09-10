import type { SceneObject, Vec3 } from "@/lib/scene/schema";

/**
 * Axis-aligned bounding box (AABB) helpers for verification.
 *
 * The scene is Y-up. `transform.position` is the object's CENTER (SceneObjectView places the
 * group there), `dimensions` is [w,h,d], and `scale` multiplies dimensions. Rotation is
 * ignored for the AABB — an axis-aligned approximation, which is sufficient for the
 * placement checks here and documented as a known simplification.
 */

export interface AABB {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  halfExtents: Vec3;
}

/** Compute the world AABB of an object from its center position, dimensions, and scale. */
export function aabb(object: SceneObject): AABB {
  const [px, py, pz] = object.transform.position;
  const [dx, dy, dz] = object.dimensions;
  const [sx, sy, sz] = object.transform.scale;
  const hx = Math.abs(dx * sx) / 2;
  const hy = Math.abs(dy * sy) / 2;
  const hz = Math.abs(dz * sz) / 2;
  return {
    center: [px, py, pz],
    halfExtents: [hx, hy, hz],
    min: [px - hx, py - hy, pz - hz],
    max: [px + hx, py + hy, pz + hz],
  };
}

/** Bottom (base) world Y of an object. */
export function baseY(object: SceneObject): number {
  return aabb(object).min[1];
}

/** Top world Y of an object. */
export function topY(object: SceneObject): number {
  return aabb(object).max[1];
}

/** Overlap amount per axis (positive = overlapping) between two AABBs. */
export function overlapPerAxis(a: AABB, b: AABB): Vec3 {
  return [
    Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]),
    Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]),
    Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]),
  ];
}

/** True if two AABBs overlap on all three axes beyond `tolerance`. */
export function overlaps(a: AABB, b: AABB, tolerance = 0): boolean {
  const o = overlapPerAxis(a, b);
  return o[0] > tolerance && o[1] > tolerance && o[2] > tolerance;
}

/** True if a's and b's X/Z footprints overlap (used for support detection). */
export function footprintOverlaps(a: AABB, b: AABB, tolerance = 0): boolean {
  const ox = Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]);
  const oz = Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]);
  return ox > tolerance && oz > tolerance;
}
