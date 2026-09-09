import { SceneSchema, SCHEMA_VERSION, type Scene } from "./schema";

/**
 * Scene serialization (Task 6 expands this with persistence + version handling).
 */

/** Serialize a scene to pretty JSON. */
export function serialize(scene: Scene): string {
  return JSON.stringify(scene, null, 2);
}

/** Error thrown when a payload cannot be turned into a valid Scene. */
export class SceneDeserializeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneDeserializeError";
  }
}

/**
 * Parse a JSON string into a validated Scene.
 * Version-aware: unknown/older versions are rejected with a clear error (Task 6 may add
 * upgrade paths), never crashing the caller.
 */
export function deserialize(json: string): Scene {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new SceneDeserializeError("Invalid JSON syntax.");
  }

  const version = (raw as { metadata?: { version?: unknown } })?.metadata?.version;
  if (version !== undefined && version !== SCHEMA_VERSION) {
    throw new SceneDeserializeError(
      `Unsupported scene version ${String(version)} (expected ${SCHEMA_VERSION}).`,
    );
  }

  const result = SceneSchema.safeParse(raw);
  if (!result.success) {
    throw new SceneDeserializeError(
      `Invalid scene: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

/** localStorage key for the persisted scene. */
export const STORAGE_KEY = "holyshift.scene.v1";

/**
 * Persist a scene to localStorage. No-op (and never throws) when localStorage is
 * unavailable (SSR, private mode, quota).
 */
export function saveToStorage(scene: Scene): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, serialize(scene));
  } catch {
    // best-effort; persistence failure must never break the app
  }
}

/**
 * Load a persisted scene from localStorage. Returns null if nothing is stored,
 * localStorage is unavailable, or the stored payload is invalid/outdated.
 */
export function loadFromStorage(): Scene | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return deserialize(raw);
  } catch {
    return null;
  }
}
