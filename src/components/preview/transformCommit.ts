import type { Vec3 } from "@/lib/scene/schema";

/** Minimal shape of a THREE.Object3D transform we read after a gizmo drag. */
export interface Object3DLike {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/** The transform patch shape accepted by updateObject. */
export interface TransformPatch {
  transform: { position: Vec3; rotation: Vec3; scale: Vec3 };
}

/**
 * Read a manipulated object3D's transform into the store's transform patch shape.
 * Pure and unit-testable (the gizmo drag itself is GL-interactive).
 */
export function readTransform(obj: Object3DLike): TransformPatch {
  return {
    transform: {
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    },
  };
}
