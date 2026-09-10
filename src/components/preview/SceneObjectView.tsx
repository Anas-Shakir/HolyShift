"use client";

import { useEffect, useRef, type ComponentType } from "react";
import type { Group } from "three";
import type { ObjectType, SceneObject } from "@/lib/scene/schema";
import {
  CubeMesh,
  SphereMesh,
  CylinderMesh,
  PlaneMesh,
  ConeMesh,
  TorusMesh,
  PrismMesh,
} from "./primitives";
import {
  DeskMesh,
  TableMesh,
  ChairMesh,
  MonitorMesh,
  PcMesh,
  LampMesh,
  PlantMesh,
  BookshelfMesh,
  SofaMesh,
  BedMesh,
  RugMesh,
  WindowMesh,
  DoorMesh,
  MugMesh,
  BottleMesh,
  StoolMesh,
  StreetlightMesh,
  GroupView,
} from "./composed";

/**
 * Table-driven dispatch from object type → renderer. Exported so tests can assert that
 * EVERY ObjectType has a renderer (guards against a missing case when types are added).
 */
export const RENDERERS: Record<ObjectType, ComponentType<{ object: SceneObject }>> = {
  // primitives
  cube: CubeMesh,
  sphere: SphereMesh,
  cylinder: CylinderMesh,
  plane: PlaneMesh,
  cone: ConeMesh,
  torus: TorusMesh,
  prism: PrismMesh,
  // free composition
  group: GroupView,
  // seeded composed
  chair: ChairMesh,
  desk: DeskMesh,
  table: TableMesh,
  monitor: MonitorMesh,
  pc: PcMesh,
  lamp: LampMesh,
  plant: PlantMesh,
  bookshelf: BookshelfMesh,
  sofa: SofaMesh,
  bed: BedMesh,
  rug: RugMesh,
  window: WindowMesh,
  door: DoorMesh,
  mug: MugMesh,
  bottle: BottleMesh,
  stool: StoolMesh,
  streetlight: StreetlightMesh,
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
 *
 * - Clicking the object selects it (stopPropagation so it doesn't reach the canvas
 *   background deselect handler).
 * - When selected, a subtle emissive highlight is layered via the `selected` flag, and the
 *   group is registered through `onSelectedRef` so the TransformControls gizmo can attach.
 */
export function SceneObjectView({
  object,
  selected = false,
  onSelect,
  onSelectedRef,
}: {
  object: SceneObject;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onSelectedRef?: (group: Group | null) => void;
}) {
  const Renderer = RENDERERS[object.type] ?? FallbackMesh;
  const { position, rotation, scale } = object.transform;
  const groupRef = useRef<Group>(null);

  // When this object is the selected one, hand its group to the gizmo; clear on deselect.
  useEffect(() => {
    if (selected) onSelectedRef?.(groupRef.current);
    return () => {
      if (selected) onSelectedRef?.(null);
    };
  }, [selected, onSelectedRef]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(object.id);
      }}
    >
      <Renderer object={object} />
      {selected && <SelectionHighlight object={object} />}
    </group>
  );
}

/** A translucent bounding box highlight around the selected object. */
function SelectionHighlight({ object }: { object: SceneObject }) {
  const [w, h, d] = object.dimensions;
  return (
    <mesh>
      <boxGeometry args={[w * 1.08, h * 1.08, d * 1.08]} />
      <meshBasicMaterial color="#7c5cff" wireframe transparent opacity={0.6} />
    </mesh>
  );
}
