"use client";

import type { SceneObject } from "@/lib/scene/schema";
import { toMaterialProps } from "./mapping";

/**
 * Composed-object renderers: recognizable shapes built from primitive meshes.
 *
 * Each renderer draws relative to the object's local origin (bottom-centered where it
 * reads best). The parent group (SceneObjectView) applies the object transform.
 * Dimensions `[w, h, d]` scale the composition.
 */

type Props = { object: SceneObject };

/** Shared material element for composed sub-meshes. */
function Mat({ object, color }: { object: SceneObject; color?: string }) {
  const m = toMaterialProps(object.material);
  return (
    <meshStandardMaterial
      color={color ?? m.color}
      metalness={m.metalness}
      roughness={m.roughness}
      transparent={m.transparent}
      opacity={m.opacity}
      emissive={m.emissive}
      emissiveIntensity={m.emissiveIntensity}
    />
  );
}

/** A box sub-part at a local position. */
function Part({
  object,
  size,
  position,
  color,
}: {
  object: SceneObject;
  size: [number, number, number];
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <Mat object={object} color={color} />
    </mesh>
  );
}

export function DeskMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const legT = Math.min(w, d) * 0.08;
  const topT = h * 0.08;
  const legH = h - topT;
  return (
    <group>
      <Part object={object} size={[w, topT, d]} position={[0, h - topT / 2, 0]} />
      <Part object={object} size={[legT, legH, legT]} position={[-w / 2 + legT, legH / 2, -d / 2 + legT]} />
      <Part object={object} size={[legT, legH, legT]} position={[w / 2 - legT, legH / 2, -d / 2 + legT]} />
      <Part object={object} size={[legT, legH, legT]} position={[-w / 2 + legT, legH / 2, d / 2 - legT]} />
      <Part object={object} size={[legT, legH, legT]} position={[w / 2 - legT, legH / 2, d / 2 - legT]} />
    </group>
  );
}

export function TableMesh({ object }: Props) {
  return <DeskMesh object={object} />;
}

export function ChairMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const seatH = h * 0.5;
  const seatT = h * 0.08;
  const legT = Math.min(w, d) * 0.12;
  const legH = seatH - seatT;
  const backH = h - seatH;
  const backT = d * 0.1;
  return (
    <group>
      {/* seat */}
      <Part object={object} size={[w, seatT, d]} position={[0, seatH - seatT / 2, 0]} />
      {/* back */}
      <Part object={object} size={[w, backH, backT]} position={[0, seatH + backH / 2, -d / 2 + backT / 2]} />
      {/* legs */}
      <Part object={object} size={[legT, legH, legT]} position={[-w / 2 + legT, legH / 2, -d / 2 + legT]} />
      <Part object={object} size={[legT, legH, legT]} position={[w / 2 - legT, legH / 2, -d / 2 + legT]} />
      <Part object={object} size={[legT, legH, legT]} position={[-w / 2 + legT, legH / 2, d / 2 - legT]} />
      <Part object={object} size={[legT, legH, legT]} position={[w / 2 - legT, legH / 2, d / 2 - legT]} />
    </group>
  );
}

export function MonitorMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const standH = h * 0.25;
  const baseT = h * 0.05;
  const panelH = h - standH;
  return (
    <group>
      {/* panel (slightly emissive-friendly screen) */}
      <Part object={object} size={[w, panelH, d]} position={[0, standH + panelH / 2, 0]} />
      {/* stand */}
      <Part object={object} size={[w * 0.1, standH, d]} position={[0, standH / 2, 0]} />
      {/* base */}
      <Part object={object} size={[w * 0.5, baseT, d * 2]} position={[0, baseT / 2, 0]} />
    </group>
  );
}

export function PcMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  return (
    <group>
      <Part object={object} size={[w, h, d]} position={[0, h / 2, 0]} />
    </group>
  );
}

export function LampMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const baseT = h * 0.08;
  const stemT = Math.min(w, d) * 0.15;
  const shadeH = h * 0.25;
  const stemH = h - baseT - shadeH;
  return (
    <group>
      <Part object={object} size={[w, baseT, d]} position={[0, baseT / 2, 0]} />
      <Part object={object} size={[stemT, stemH, stemT]} position={[0, baseT + stemH / 2, 0]} />
      <Part object={object} size={[w, shadeH, d]} position={[0, baseT + stemH + shadeH / 2, 0]} />
    </group>
  );
}
