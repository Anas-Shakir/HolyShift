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
import { verifyGeometry } from "@/lib/verify/geometry";
import { applyFix as applyFixOp, applyFixes as applyFixesOp } from "@/lib/verify/fixes";
import type { Issue } from "@/lib/verify/types";
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
  /** Currently selected object id (for direct manipulation), or null. */
  selectedId: string | null;
  /** Verification issues from the last verifyScene() run. */
  issues: Issue[];
  /** True once verifyScene() has been run (to distinguish "no issues" from "not run"). */
  verified: boolean;

  // selection actions
  select: (id: string) => void;
  deselect: () => void;

  // verification actions
  verifyScene: () => Issue[];
  applyFix: (key: string) => void;
  applyFixAll: () => void;
  /** Merge additional issues (e.g. from the vision tier) into the current list. */
  addIssues: (extra: Issue[]) => void;

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
  selectedId: null,
  issues: [],
  verified: false,

  select: (id) => set({ selectedId: id }),
  deselect: () => set({ selectedId: null }),

  verifyScene: () => {
    const found = verifyGeometry(get().scene);
    set({ issues: found, verified: true });
    return found;
  },

  applyFix: (key) => {
    const issue = get().issues.find((i) => i.key === key);
    if (!issue) return;
    try {
      const next = applyFixOp(get().scene, issue);
      // Re-verify so the issue list reflects the corrected scene.
      set({ scene: next, issues: verifyGeometry(next), status: "idle", error: null });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  applyFixAll: () => {
    const next = applyFixesOp(get().scene, get().issues);
    set({ scene: next, issues: verifyGeometry(next), status: "idle", error: null });
  },

  addIssues: (extra) => {
    // Merge, de-duplicating by key (vision issues use "semantic:*" keys).
    const existing = get().issues;
    const seen = new Set(existing.map((i) => i.key));
    const merged = [...existing, ...extra.filter((i) => !seen.has(i.key))];
    set({ issues: merged, verified: true });
  },

  addObject: (type, overrides) => runOp(get, set, (s) => addObject(s, type, overrides)),
  updateObject: (id, patch) => runOp(get, set, (s) => updateObject(s, id, patch)),
  removeObject: (id) => {
    runOp(get, set, (s) => removeObject(s, id));
    // Clear selection if we just removed the selected object.
    if (get().selectedId === id) set({ selectedId: null });
  },
  updateEnvironment: (patch) => runOp(get, set, (s) => updateEnvironment(s, patch)),
  updateCamera: (patch) => runOp(get, set, (s) => updateCamera(s, patch)),
  updateLights: (lights) => runOp(get, set, (s) => updateLights(s, lights)),

  replaceScene: (scene) => runOp(get, set, () => SceneSchema.parse(scene)),

  applyAgentPatch: (patch) => {
    const result = applyPatch(get().scene, patch);
    // Clear selection if the selected object no longer exists after the patch.
    const stillExists = result.scene.objects.some((o) => o.id === get().selectedId);
    set({
      scene: result.scene,
      status: result.errors.length > 0 ? "error" : "idle",
      error: result.errors.length > 0 ? result.errors.join("; ") : null,
      ...(stillExists ? {} : { selectedId: null }),
    });
    return { applied: result.applied, errors: result.errors, clarification: result.clarification };
  },

  resetScene: () => set({ scene: createEmptyScene(), status: "idle", error: null, selectedId: null }),
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
