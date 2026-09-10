import type { Vec3, Transform, Material } from "@/lib/scene/schema";

/**
 * Verification issue model. A verifier (deterministic geometry, or the optional vision tier)
 * produces Issue[]; the UI proposes them and applies their fixes on user confirm.
 */

export type Severity = "error" | "warning";

export type IssueKind =
  | "below_floor"
  | "floating"
  | "interpenetration"
  | "out_of_bounds"
  | "bad_scale"
  | "missing"
  | "semantic";

/** A suggested fix, expressed as an updateObject patch on a specific object. */
export interface Fix {
  objectId: string;
  patch: {
    transform?: Partial<Transform>;
    dimensions?: Vec3;
    material?: Partial<Material>;
  };
}

export interface Issue {
  /** Stable key, e.g. "floating:chair_01". */
  key: string;
  severity: Severity;
  kind: IssueKind;
  message: string;
  /** Target object id(s), for selection + fixing. */
  objectIds: string[];
  /** Present when the issue can be auto-fixed. */
  fix?: Fix;
}
