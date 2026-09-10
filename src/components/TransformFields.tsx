"use client";

import { useSceneStore } from "@/store/sceneStore";
import type { Vec3 } from "@/lib/scene/schema";

/**
 * TransformFields — precise numeric editing of the selected object's transform.
 *
 * Shown in the ObjectPanel when an object is selected. Position and scale are edited
 * directly; rotation is shown in DEGREES (friendlier) and converted to radians on write.
 * Every edit goes through the same `updateObject` action the gizmo and AI use, so the
 * store stays the single source of truth. Invalid/blank input is ignored (no bad writes).
 */
const DEG = 180 / Math.PI;

function Row({
  label,
  values,
  onChange,
}: {
  label: string;
  values: [number, number, number];
  onChange: (axis: 0 | 1 | 2, value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      {([0, 1, 2] as const).map((axis) => (
        <input
          key={axis}
          type="number"
          aria-label={`${label} ${["x", "y", "z"][axis]}`}
          value={Number.isFinite(values[axis]) ? round(values[axis]) : ""}
          step={0.1}
          onChange={(e) => {
            const v = Number.parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(axis, v);
          }}
          className="w-full min-w-0 rounded border border-edge bg-panel-alt px-1.5 py-1 text-[11px] text-neutral-200 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      ))}
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function TransformFields() {
  const selectedId = useSceneStore((s) => s.selectedId);
  const object = useSceneStore((s) =>
    s.scene.objects.find((o) => o.id === s.selectedId),
  );
  const updateObject = useSceneStore((s) => s.updateObject);

  if (!selectedId || !object) return null;

  const { position, rotation, scale } = object.transform;
  const rotationDeg: [number, number, number] = [
    rotation[0] * DEG,
    rotation[1] * DEG,
    rotation[2] * DEG,
  ];

  const setVec = (
    key: "position" | "rotation" | "scale",
    current: Vec3,
    axis: 0 | 1 | 2,
    value: number,
  ) => {
    const next: Vec3 = [...current] as Vec3;
    next[axis] = value;
    updateObject(selectedId, { transform: { [key]: next } });
  };

  return (
    <div
      data-testid="transform-fields"
      className="space-y-1 border-t border-edge p-3"
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
          Transform
        </span>
        <span className="truncate text-[10px] text-neutral-500">{object.name}</span>
      </div>
      <Row
        label="Pos"
        values={position}
        onChange={(axis, v) => setVec("position", position, axis, v)}
      />
      <Row
        label="Rot°"
        values={rotationDeg}
        onChange={(axis, v) =>
          setVec("rotation", rotation, axis, v / DEG)
        }
      />
      <Row
        label="Scale"
        values={scale}
        onChange={(axis, v) => setVec("scale", scale, axis, v)}
      />
    </div>
  );
}
