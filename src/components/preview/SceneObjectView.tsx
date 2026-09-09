"use client";

import type { ComponentType } from "react";
import type { ObjectType, SceneObject } from "@/lib/scene/schema";
import { CubeMesh, SphereMesh, CylinderMesh, PlaneMesh } from "./primitives";
import { DeskMesh, TableMesh, ChairMesh, MonitorMesh, PcMesh, LampMesh } from "./composed";

/**
 * Table-driven dispatch from object type → renderer. Exported so tests can assert that
 * EVERY ObjectType has a renderer (guards against a missing case when types are added).
 */
export const RENDERERS: Record<ObjectType, ComponentType<{ object: SceneObject }>> = {
  cube: CubeMesh,
  sphere: SphereMesh,
  cylinder: CylinderMesh,
  plane: PlaneMesh,
  chair: ChairMesh,
  desk: DeskMesh,
  table: TableMesh,
  monitor: MonitorMesh,
  pc: PcMesh,
  lamp: LampMesh,
};

/** Defensive fallback for an unknown type (impossible by schema, but degrades gracefully). */
function FallbackMesh({ object }: { object: SceneObject }) {
  return (
    <mesh>
      <boxGeometry args={object.dimensions} />
      <meshStandardMaterial color="#ff00ff" wireframe />
    </mesh>
  );
}

/**
 * Renders one scene object: applies the object transform to a group, then dispatches to
 * the type-specific renderer.
 */
export function SceneObjectView({ object }: { object: SceneObject }) {
  const Renderer = RENDERERS[object.type] ?? FallbackMesh;
  const { position, rotation, scale } = object.transform;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Renderer object={object} />
    </group>
  );
}
