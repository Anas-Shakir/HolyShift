import type { Scene } from "@/lib/scene/schema";
import { updateObject } from "@/lib/scene/operations";
import type { Issue } from "./types";

/**
 * Apply verification fixes to the scene via the same updateObject path everything else uses,
 * so the state stays authoritative and each change is Zod-validated. Non-throwing: a fix that
 * would produce an invalid scene is skipped rather than corrupting state.
 */

/** Apply a single issue's fix (no-op if the issue has no fix). Returns the new scene. */
export function applyFix(scene: Scene, issue: Issue): Scene {
  if (!issue.fix) return scene;
  try {
    return updateObject(scene, issue.fix.objectId, issue.fix.patch);
  } catch {
    return scene; // skip invalid fixes
  }
}

/** Apply all fixable issues in order. Fixes are independent transform tweaks. */
export function applyFixes(scene: Scene, issues: Issue[]): Scene {
  return issues.reduce((acc, issue) => applyFix(acc, issue), scene);
}

/** True if the issue carries an automatic fix. */
export function isFixable(issue: Issue): boolean {
  return issue.fix !== undefined;
}
