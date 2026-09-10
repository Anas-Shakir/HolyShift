import type { Scene, Light } from "@/lib/scene/schema";
import {
  addObject,
  updateObject,
  removeObject,
  updateEnvironment,
  updateLights,
} from "@/lib/scene/operations";
import { byId, byOrdinal, byType } from "@/lib/scene/resolve";
import { makeLightId } from "@/lib/scene/ids";
import type { ScenePatch, Operation, Target } from "./patch";

/**
 * Apply a validated ScenePatch to a scene using the Spec 1 operations.
 *
 * Pure and non-throwing: operations are applied in order; a failing op is recorded in
 * `errors` but does not abort the rest, and the scene is re-validated by each operation.
 * Unreferenced objects are always preserved (the state-aware editing contract).
 */

export interface ApplyResult {
  scene: Scene;
  /** Human-readable descriptions of successfully applied operations. */
  applied: string[];
  /** Per-operation error messages (index-tagged). */
  errors: string[];
  /** Clarification carried through from the patch, if any. */
  clarification?: string;
}

/** Resolve a Target to a concrete object id against the current scene, or return an error. */
function resolveTargetId(scene: Scene, target: Target): { id: string } | { error: string } {
  if ("id" in target) {
    return byId(scene, target.id) ? { id: target.id } : { error: `No object with id "${target.id}"` };
  }
  const matches = byType(scene, target.type);
  if (matches.length === 0) return { error: `No ${target.type} in the scene` };
  if (target.ordinal !== undefined) {
    const obj = byOrdinal(scene, target.type, target.ordinal);
    return obj ? { id: obj.id } : { error: `There is no ${target.type} #${target.ordinal}` };
  }
  if (matches.length > 1) {
    return {
      error: `Ambiguous reference: ${matches.length} ${target.type}s exist; specify which one`,
    };
  }
  return { id: matches[0].id };
}

/** Convert a create/update field bundle into the operations-layer patch shape. */
function toObjectPatch(fields: {
  name?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  dimensions?: [number, number, number];
  material?: Record<string, unknown>;
}) {
  const transform: Record<string, unknown> = {};
  if (fields.position) transform.position = fields.position;
  if (fields.rotation) transform.rotation = fields.rotation;
  if (fields.scale) transform.scale = fields.scale;

  return {
    ...(fields.name !== undefined ? { name: fields.name } : {}),
    ...(fields.dimensions !== undefined ? { dimensions: fields.dimensions } : {}),
    ...(Object.keys(transform).length ? { transform } : {}),
    ...(fields.material ? { material: fields.material } : {}),
  };
}

/** Fill a full material from a partial one (AI children carry partial material). */
function fullChildMaterial(partial?: Record<string, unknown>) {
  return {
    color: (partial?.color as string) ?? "#b8bec9",
    metalness: (partial?.metalness as number) ?? 0,
    roughness: (partial?.roughness as number) ?? 0.6,
    opacity: (partial?.opacity as number) ?? 1,
    emissiveIntensity: (partial?.emissiveIntensity as number) ?? 0,
  };
}

/** Convert AI-supplied group children into full GroupChild objects for the factory. */
function toGroupChildren(children: ReadonlyArray<Record<string, unknown>>) {
  return children.map((c) => ({
    type: c.type,
    position: c.position ?? [0, 0, 0],
    rotation: c.rotation ?? [0, 0, 0],
    dimensions: c.dimensions ?? [1, 1, 1],
    material: fullChildMaterial(c.material as Record<string, unknown> | undefined),
  }));
}

function applyOne(scene: Scene, op: Operation): { scene: Scene; message: string } {
  switch (op.op) {
    case "create": {
      const { type, children, ...fields } = op.object as typeof op.object & {
        children?: Record<string, unknown>[];
      };
      const overrides = toObjectPatch(fields) as Record<string, unknown>;
      if (type === "group" && Array.isArray(children)) {
        overrides.children = toGroupChildren(children);
      }
      return {
        scene: addObject(scene, type, overrides as never),
        message: `Created ${op.object.name ?? type}`,
      };
    }
    case "update": {
      const resolved = resolveTargetId(scene, op.target);
      if ("error" in resolved) throw new Error(resolved.error);
      return {
        scene: updateObject(scene, resolved.id, toObjectPatch(op.changes) as never),
        message: `Updated ${resolved.id}`,
      };
    }
    case "delete": {
      const resolved = resolveTargetId(scene, op.target);
      if ("error" in resolved) throw new Error(resolved.error);
      return { scene: removeObject(scene, resolved.id), message: `Deleted ${resolved.id}` };
    }
    case "setEnvironment": {
      return {
        scene: updateEnvironment(scene, op.changes),
        message: `Updated environment`,
      };
    }
    case "addLight": {
      const id = makeLightId(scene.lights.map((l) => l.id));
      const light: Light = { id, ...op.light };
      return { scene: updateLights(scene, [...scene.lights, light]), message: `Added ${id}` };
    }
    case "removeLight": {
      if (!scene.lights.some((l) => l.id === op.id)) {
        throw new Error(`No light with id "${op.id}"`);
      }
      return {
        scene: updateLights(
          scene,
          scene.lights.filter((l) => l.id !== op.id),
        ),
        message: `Removed ${op.id}`,
      };
    }
  }
}

export function applyPatch(scene: Scene, patch: ScenePatch): ApplyResult {
  let current = scene;
  const applied: string[] = [];
  const errors: string[] = [];

  patch.operations.forEach((op, i) => {
    try {
      const result = applyOne(current, op);
      current = result.scene;
      applied.push(result.message);
    } catch (err) {
      errors.push(`Operation ${i + 1} (${op.op}): ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  return {
    scene: current,
    applied,
    errors,
    ...(patch.clarification ? { clarification: patch.clarification } : {}),
  };
}
