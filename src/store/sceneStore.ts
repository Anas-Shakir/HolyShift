import { create } from "zustand";
import {
  SceneSchema,
  type Scene,
  type ObjectType,
  type SceneObject,
  type Environment,
  type Camera,
  type Light,
} from "@/lib/scene/schema";
import { createEmptyScene } from "@/lib/scene/factory";
import { loadFromStorage, saveToStorage } from "@/lib/scene/serialize";
import { applyPatch } from "@/lib/agent/apply";
import type { ScenePatch } from "@/lib/agent/patch";
import {
  addObject,
  updateObject,
  removeObject,
  updateEnvironment,
  updateCamera,
  updateLights,
} from "@/lib/scene/operations";

/**
 * Zustand store holding the canonical, browser-authoritative scene state.
 *
 * Every action wraps a pure operation from lib/scene/operations. If an operation throws
 * (invalid result), the store catches it, sets status='error' with a message, and KEEPS
 * the last-good scene — the world is never corrupted by a bad edit.
 *
 * Persistence (Task 6) subscribes to this store; it is intentionally not wired here.
 */

export type SceneStatus = "idle" | "loading" | "error";

export interface SceneState {
  scene: Scene;
  status: SceneStatus;
  error: string | null;

  // actions
  addObject: (type: ObjectType, overrides?: Partial<Omit<SceneObject, "id" | "type">>) => void;
  updateObject: (id: string, patch: Parameters<typeof updateObject>[2]) => void;
  removeObject: (id: string) => void;
  updateEnvironment: (patch: Partial<Environment>) => void;
  updateCamera: (patch: Partial<Camera>) => void;
  updateLights: (lights: Light[]) => void;
  /** Replace the whole scene (e.g. from the JSON inspector or import). Validated. */
  replaceScene: (scene: Scene) => void;
  /** Apply an AI-produced patch; returns applied/errors/clarification for the UI. */
  applyAgentPatch: (patch: ScenePatch) => {
    applied: string[];
    errors: string[];
    clarification?: string;
  };
  /** Reset to a fresh empty scene. */
  resetScene: () => void;
  clearError: () => void;
}

/** Run a state transition, catching operation errors and preserving the last-good scene. */
function runOp(
  get: () => SceneState,
  set: (partial: Partial<SceneState>) => void,
  op: (scene: Scene) => Scene,
): void {
  try {
    const next = op(get().scene);
    set({ scene: next, status: "idle", error: null });
  } catch (err) {
    set({ status: "error", error: err instanceof Error ? err.message : String(err) });
  }
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: createEmptyScene(),
  status: "idle",
  error: null,

  addObject: (type, overrides) => runOp(get, set, (s) => addObject(s, type, overrides)),
  updateObject: (id, patch) => runOp(get, set, (s) => updateObject(s, id, patch)),
  removeObject: (id) => runOp(get, set, (s) => removeObject(s, id)),
  updateEnvironment: (patch) => runOp(get, set, (s) => updateEnvironment(s, patch)),
  updateCamera: (patch) => runOp(get, set, (s) => updateCamera(s, patch)),
  updateLights: (lights) => runOp(get, set, (s) => updateLights(s, lights)),

  replaceScene: (scene) => runOp(get, set, () => SceneSchema.parse(scene)),

  applyAgentPatch: (patch) => {
    const result = applyPatch(get().scene, patch);
    set({
      scene: result.scene,
      status: result.errors.length > 0 ? "error" : "idle",
      error: result.errors.length > 0 ? result.errors.join("; ") : null,
    });
    return { applied: result.applied, errors: result.errors, clarification: result.clarification };
  },

  resetScene: () => set({ scene: createEmptyScene(), status: "idle", error: null }),
  clearError: () => set({ status: "idle", error: null }),
}));

/**
 * Hydrate the store from localStorage (call once on the client) and persist every
 * subsequent scene change. Kept outside create() so it never runs during SSR or tests
 * that don't opt in.
 */
export function initScenePersistence(): () => void {
  const restored = loadFromStorage();
  if (restored) {
    useSceneStore.setState({ scene: restored, status: "idle", error: null });
  }
  return useSceneStore.subscribe((state) => saveToStorage(state.scene));
}
