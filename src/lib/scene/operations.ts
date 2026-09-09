import {
  SceneSchema,
  type Scene,
  type SceneObject,
  type ObjectType,
  type Light,
  type Camera,
  type Environment,
  type Transform,
  type Material,
} from "./schema";
import { createDefaultObject } from "./factory";

/**
 * Pure, immutable, validated state operations.
 *
 * Every operation returns a NEW Scene and re-validates the result against SceneSchema,
 * so an invalid mutation throws instead of corrupting the world. Unaffected parts of the
 * world are always preserved — this is the "State(t+1) = Agent(State(t), input)" contract
 * from the blueprint that makes iterative editing safe.
 *
 * Errors are thrown as SceneOperationError; the store (Task 5) catches these and keeps
 * the last-good scene.
 */

export class SceneOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneOperationError";
  }
}

/** Collect all ids currently used in the scene (objects + lights). */
function allIds(scene: Scene): string[] {
  return [...scene.objects.map((o) => o.id), ...scene.lights.map((l) => l.id)];
}

/** Validate and return, converting Zod errors into SceneOperationError. */
function validate(scene: Scene): Scene {
  const result = SceneSchema.safeParse(scene);
  if (!result.success) {
    throw new SceneOperationError(
      `Invalid scene after operation: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

/** Add a new object of `type` (with optional field overrides). */
export function addObject(
  scene: Scene,
  type: ObjectType,
  overrides: Partial<Omit<SceneObject, "id" | "type">> = {},
): Scene {
  const obj = createDefaultObject(type, allIds(scene), overrides);
  return validate({ ...scene, objects: [...scene.objects, obj] });
}

/** Add a fully-formed object (e.g. from AI output). Rejects duplicate ids. */
export function addObjectRaw(scene: Scene, obj: SceneObject): Scene {
  if (scene.objects.some((o) => o.id === obj.id)) {
    throw new SceneOperationError(`Duplicate object id: ${obj.id}`);
  }
  return validate({ ...scene, objects: [...scene.objects, obj] });
}

/** Deep-merge a partial patch into transform / dimensions / material / name / parentId. */
export function updateObject(
  scene: Scene,
  id: string,
  patch: {
    name?: string;
    parentId?: string;
    transform?: Partial<Transform>;
    dimensions?: SceneObject["dimensions"];
    material?: Partial<Material>;
  },
): Scene {
  const index = scene.objects.findIndex((o) => o.id === id);
  if (index === -1) throw new SceneOperationError(`No object with id: ${id}`);

  const current = scene.objects[index];
  const next: SceneObject = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.parentId !== undefined ? { parentId: patch.parentId } : {}),
    ...(patch.dimensions !== undefined ? { dimensions: patch.dimensions } : {}),
    transform: patch.transform
      ? { ...current.transform, ...patch.transform }
      : current.transform,
    material: patch.material ? { ...current.material, ...patch.material } : current.material,
  };

  const objects = [...scene.objects];
  objects[index] = next;
  return validate({ ...scene, objects });
}

/** Remove an object by id. Throws if it does not exist. */
export function removeObject(scene: Scene, id: string): Scene {
  if (!scene.objects.some((o) => o.id === id)) {
    throw new SceneOperationError(`No object with id: ${id}`);
  }
  return validate({ ...scene, objects: scene.objects.filter((o) => o.id !== id) });
}

/** Merge a partial patch into the environment. */
export function updateEnvironment(scene: Scene, patch: Partial<Environment>): Scene {
  return validate({ ...scene, environment: { ...scene.environment, ...patch } });
}

/** Replace the lights array. */
export function updateLights(scene: Scene, lights: Light[]): Scene {
  return validate({ ...scene, lights });
}

/** Merge a partial patch into the camera. */
export function updateCamera(scene: Scene, patch: Partial<Camera>): Scene {
  return validate({ ...scene, camera: { ...scene.camera, ...patch } });
}
