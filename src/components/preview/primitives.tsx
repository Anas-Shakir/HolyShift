"use client";

import type { SceneObject } from "@/lib/scene/schema";
import { toMaterialProps, boxArgs, sphereRadius, cylinderArgs, planeArgs } from "./mapping";

/**
 * Single-mesh renderers for the core primitive types.
 * Each renders geometry sized from `dimensions` with the object's material.
 * The parent group (SceneObjectView) applies the transform, so these draw at local origin.
 */

function StandardMaterial({ object }: { object: SceneObject }) {
  const m = toMaterialProps(object.material);
  return (
    <meshStandardMaterial
      color={m.color}
      metalness={m.metalness}
      roughness={m.roughness}
      transparent={m.transparent}
      opacity={m.opacity}
      emissive={m.emissive}
      emissiveIntensity={m.emissiveIntensity}
    />
  );
}

export function CubeMesh({ object }: { object: SceneObject }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={boxArgs(object.dimensions)} />
      <StandardMaterial object={object} />
    </mesh>
  );
}

export function SphereMesh({ object }: { object: SceneObject }) {
  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[sphereRadius(object.dimensions), 32, 32]} />
      <StandardMaterial object={object} />
    </mesh>
  );
}

export function CylinderMesh({ object }: { object: SceneObject }) {
  return (
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={cylinderArgs(object.dimensions)} />
      <StandardMaterial object={object} />
    </mesh>
  );
}

export function PlaneMesh({ object }: { object: SceneObject }) {
  return (
    <mesh receiveShadow>
      <boxGeometry args={planeArgs(object.dimensions)} />
      <StandardMaterial object={object} />
    </mesh>
  );
}
