import type { Material, ObjectType, Vec3 } from "@/lib/scene/schema";

/**
 * Pure mapping helpers: scene state → Three.js props.
 *
 * These carry the renderer's logic in a form that can be unit-tested without WebGL/jsdom.
 * Keeping them pure also means the R3F components stay thin and declarative.
 */

/** Props for a standard material, derived from a scene Material. */
export interface StandardMaterialProps {
  color: string;
  metalness: number;
  roughness: number;
  transparent: boolean;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
}

/** Convert a scene Material into meshStandardMaterial props. */
export function toMaterialProps(material: Material): StandardMaterialProps {
  return {
    color: material.color,
    metalness: material.metalness,
    roughness: material.roughness,
    transparent: material.opacity < 1,
    opacity: material.opacity,
    // Emit the object's own color when emissive is requested (neon look).
    emissive: material.emissiveIntensity > 0 ? material.color : "#000000",
    emissiveIntensity: material.emissiveIntensity,
  };
}

/** Box geometry args `[w, h, d]` from dimensions. */
export function boxArgs(dimensions: Vec3): [number, number, number] {
  return [dimensions[0], dimensions[1], dimensions[2]];
}

/** Sphere radius from dimensions (uses half the largest extent). */
export function sphereRadius(dimensions: Vec3): number {
  return Math.max(dimensions[0], dimensions[1], dimensions[2]) / 2;
}

/** Cylinder args `[radiusTop, radiusBottom, height, radialSegments]`. */
export function cylinderArgs(dimensions: Vec3): [number, number, number, number] {
  const radius = Math.max(dimensions[0], dimensions[2]) / 2;
  return [radius, radius, dimensions[1], 24];
}

/** Plane rendered as a thin box `[w, thickness, d]` so it reads with lighting. */
export function planeArgs(dimensions: Vec3): [number, number, number] {
  const thickness = Math.max(dimensions[1], 0.02);
  return [dimensions[0], thickness, dimensions[2]];
}

/** The four core primitive types. */
export const PRIMITIVE_TYPES: ObjectType[] = ["cube", "sphere", "cylinder", "plane"];

/** The composed types (rendered as grouped primitives). */
export const COMPOSED_TYPES: ObjectType[] = ["chair", "desk", "table", "monitor", "pc", "lamp"];

/** True if the type is a core primitive (single mesh). */
export function isPrimitive(type: ObjectType): boolean {
  return PRIMITIVE_TYPES.includes(type);
}
