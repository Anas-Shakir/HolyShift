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


/** A cylinder sub-part (upright), radius from x/z, height from y. */
function CylPart({
  object,
  radius,
  height,
  position,
  color,
}: {
  object: SceneObject;
  radius: number;
  height: number;
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 20]} />
      <Mat object={object} color={color} />
    </mesh>
  );
}

/** A sphere sub-part. */
function SpherePart({
  object,
  radius,
  position,
  color,
}: {
  object: SceneObject;
  radius: number;
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[radius, 20, 16]} />
      <Mat object={object} color={color} />
    </mesh>
  );
}

/** A cone sub-part (point up). */
function ConePart({
  object,
  radius,
  height,
  position,
  color,
}: {
  object: SceneObject;
  radius: number;
  height: number;
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <coneGeometry args={[radius, height, 20]} />
      <Mat object={object} color={color} />
    </mesh>
  );
}

export function PlantMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const potH = h * 0.3;
  const potR = Math.min(w, d) * 0.35;
  const foliageR = Math.min(w, d) * 0.5;
  return (
    <group>
      <CylPart object={object} radius={potR} height={potH} position={[0, potH / 2, 0]} color="#8b5a2b" />
      <SpherePart object={object} radius={foliageR} position={[0, potH + foliageR * 0.9, 0]} color="#3f7d3a" />
    </group>
  );
}

export function BookshelfMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const t = Math.min(w, h) * 0.05;
  const parts = [];
  // sides + top/bottom
  parts.push(<Part key="l" object={object} size={[t, h, d]} position={[-w / 2 + t / 2, h / 2, 0]} />);
  parts.push(<Part key="r" object={object} size={[t, h, d]} position={[w / 2 - t / 2, h / 2, 0]} />);
  // shelves
  const shelfCount = 4;
  for (let i = 0; i <= shelfCount; i++) {
    const y = (h / shelfCount) * i;
    parts.push(<Part key={`s${i}`} object={object} size={[w, t, d]} position={[0, Math.min(y, h - t / 2) + t / 2, 0]} />);
  }
  return <group>{parts}</group>;
}

export function SofaMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const seatH = h * 0.45;
  const baseT = seatH;
  const backH = h - seatH;
  const armW = w * 0.12;
  return (
    <group>
      <Part object={object} size={[w, baseT, d]} position={[0, baseT / 2, 0]} />
      <Part object={object} size={[w, backH, d * 0.2]} position={[0, seatH + backH / 2, -d / 2 + d * 0.1]} />
      <Part object={object} size={[armW, backH, d]} position={[-w / 2 + armW / 2, seatH + backH / 2, 0]} />
      <Part object={object} size={[armW, backH, d]} position={[w / 2 - armW / 2, seatH + backH / 2, 0]} />
    </group>
  );
}

export function BedMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const baseH = h * 0.5;
  const mattH = h * 0.35;
  const pillowH = h * 0.15;
  return (
    <group>
      <Part object={object} size={[w, baseH, d]} position={[0, baseH / 2, 0]} color="#5a4636" />
      <Part object={object} size={[w * 0.96, mattH, d * 0.98]} position={[0, baseH + mattH / 2, 0]} />
      <Part object={object} size={[w * 0.8, pillowH, d * 0.2]} position={[0, baseH + mattH + pillowH / 2, -d / 2 + d * 0.14]} color="#e6e8ee" />
    </group>
  );
}

export function RugMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const t = Math.max(h, 0.02);
  return (
    <group>
      <Part object={object} size={[w, t, d]} position={[0, t / 2, 0]} />
    </group>
  );
}

export function WindowMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const f = Math.min(w, h) * 0.08;
  return (
    <group>
      {/* frame */}
      <Part object={object} size={[w, f, d]} position={[0, h - f / 2, 0]} />
      <Part object={object} size={[w, f, d]} position={[0, f / 2, 0]} />
      <Part object={object} size={[f, h, d]} position={[-w / 2 + f / 2, h / 2, 0]} />
      <Part object={object} size={[f, h, d]} position={[w / 2 - f / 2, h / 2, 0]} />
      {/* glass */}
      <Part object={object} size={[w - 2 * f, h - 2 * f, d * 0.3]} position={[0, h / 2, 0]} color="#9fb7c9" />
    </group>
  );
}

export function DoorMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  return (
    <group>
      <Part object={object} size={[w, h, d]} position={[0, h / 2, 0]} />
      <SpherePart object={object} radius={Math.min(w, h) * 0.05} position={[w / 2 - w * 0.15, h * 0.5, d]} color="#d4b24a" />
    </group>
  );
}

export function MugMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const r = Math.min(w, d) * 0.5;
  return (
    <group>
      <CylPart object={object} radius={r} height={h} position={[0, h / 2, 0]} />
      {/* handle: a small torus on the side, laid vertical */}
      <mesh position={[r, h * 0.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[r * 0.5, r * 0.15, 12, 20]} />
        <Mat object={object} />
      </mesh>
    </group>
  );
}

export function BottleMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const r = Math.min(w, d) * 0.5;
  const bodyH = h * 0.7;
  const neckH = h * 0.3;
  return (
    <group>
      <CylPart object={object} radius={r} height={bodyH} position={[0, bodyH / 2, 0]} />
      <CylPart object={object} radius={r * 0.4} height={neckH} position={[0, bodyH + neckH / 2, 0]} />
    </group>
  );
}

export function StoolMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const seatT = h * 0.12;
  const legT = Math.min(w, d) * 0.1;
  const legH = h - seatT;
  return (
    <group>
      <CylPart object={object} radius={Math.min(w, d) * 0.5} height={seatT} position={[0, h - seatT / 2, 0]} />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <Part
          key={i}
          object={object}
          size={[legT, legH, legT]}
          position={[sx * (w / 2 - legT), legH / 2, sz * (d / 2 - legT)]}
        />
      ))}
    </group>
  );
}

export function StreetlightMesh({ object }: Props) {
  const [w, h, d] = object.dimensions;
  const poleR = Math.min(w, d) * 0.4;
  const armLen = w * 1.5;
  return (
    <group>
      <CylPart object={object} radius={poleR} height={h} position={[0, h / 2, 0]} />
      <Part object={object} size={[armLen, poleR, poleR]} position={[armLen / 2 - poleR, h - poleR, 0]} />
      <SpherePart object={object} radius={poleR * 1.5} position={[armLen - poleR, h - poleR, 0]} color="#fff2b0" />
    </group>
  );
}

/**
 * GroupView — renders a `group` object's children, each a primitive at its local transform.
 * Children colors come from their own material.
 */
export function GroupView({ object }: Props) {
  const children = object.children ?? [];
  return (
    <group>
      {children.map((child, i) => (
        <mesh
          key={i}
          position={child.position}
          rotation={child.rotation}
          castShadow
          receiveShadow
        >
          <ChildGeometry
            type={child.type}
            dimensions={child.dimensions}
          />
          <meshStandardMaterial
            color={child.material.color}
            metalness={child.material.metalness}
            roughness={child.material.roughness}
            transparent={child.material.opacity < 1}
            opacity={child.material.opacity}
            emissive={child.material.emissiveIntensity > 0 ? child.material.color : "#000000"}
            emissiveIntensity={child.material.emissiveIntensity}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Geometry element for a group child by primitive type. */
function ChildGeometry({
  type,
  dimensions,
}: {
  type: string;
  dimensions: [number, number, number];
}) {
  const [x, y, z] = dimensions;
  const radius = Math.max(x, z) / 2;
  switch (type) {
    case "sphere":
      return <sphereGeometry args={[Math.max(x, y, z) / 2, 24, 16]} />;
    case "cylinder":
      return <cylinderGeometry args={[radius, radius, y, 20]} />;
    case "cone":
      return <coneGeometry args={[radius, y, 20]} />;
    case "torus":
      return <torusGeometry args={[radius, Math.max(y / 2, radius * 0.25), 12, 24]} />;
    case "prism":
      return <cylinderGeometry args={[radius, radius, y, 3]} />;
    case "plane":
      return <boxGeometry args={[x, Math.max(y, 0.02), z]} />;
    case "cube":
    default:
      return <boxGeometry args={[x, y, z]} />;
  }
}
