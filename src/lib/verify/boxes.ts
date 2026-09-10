import { PRIMITIVE_TYPES, type SceneObject, type Vec3, type PrimitiveType } from "@/lib/scene/schema";

/**
 * Axis-aligned bounding box (AABB) helpers for verification.
 *
 * The scene is Y-up. `transform.position` is the object's ANCHOR; `dimensions` is [w,h,d],
 * and `scale` multiplies dimensions. Rotation is ignored (axis-aligned approximation).
 *
 * IMPORTANT — vertical anchoring differs by object kind (this must match the renderers and
 * the Blender compiler, or "fixes" push objects the wrong way):
 *   - PRIMITIVES are CENTER-anchored: their geometry spans [py - h/2, py + h/2].
 *   - COMPOSED objects and GROUPS are BOTTOM-anchored: every part is built from local y = 0
 *     upward, so their geometry spans [py, py + h]. (See components/preview/composed.tsx.)
 * X and Z are center-anchored for all kinds.
 */

export interface AABB {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  halfExtents: Vec3;
}

const PRIMITIVE_SET = new Set<PrimitiveType>(PRIMITIVE_TYPES);

/** True if the object's geometry is built bottom-up from local y=0 (composed / group). */
export function isBottomAnchored(object: SceneObject): boolean {
  return !PRIMITIVE_SET.has(object.type as PrimitiveType);
}

/** Compute the world AABB of an object, honoring its vertical anchor. */
export function aabb(object: SceneObject): AABB {
  const [px, py, pz] = object.transform.position;
  const [dx, dy, dz] = object.dimensions;
  const [sx, sy, sz] = object.transform.scale;
  const hx = Math.abs(dx * sx) / 2;
  const hyFull = Math.abs(dy * sy); // full height
  const hy = hyFull / 2;
  const hz = Math.abs(dz * sz) / 2;

  // Vertical span depends on anchoring.
  const bottomAnchored = isBottomAnchored(object);
  const minY = bottomAnchored ? py : py - hy;
  const maxY = bottomAnchored ? py + hyFull : py + hy;
  const centerY = (minY + maxY) / 2;

  return {
    center: [px, centerY, pz],
    halfExtents: [hx, hy, hz],
    min: [px - hx, minY, pz - hz],
    max: [px + hx, maxY, pz + hz],
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
