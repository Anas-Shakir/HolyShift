# Requirements — Scene Verification & Self-Correction

**Spec 7 of 8.** P1 stretch. Depends on Specs 1-3. Pre-sync, web-preview based (a
refinement of the blueprint's Blender-post-sync verification — see design for rationale).

## Introduction

Before the user commits a scene to Blender, let them verify it and fix problems in the web
state. Verification is TWO-TIER:

1. **Deterministic geometric checks** on the structured state (primary): floating objects,
   interpenetration, out-of-bounds, absurd scale, expected-object presence. Fast, free,
   reliable — and each issue carries a concrete suggested fix (an `updateObject` patch).
2. **Vision model** (optional stretch): capture the web canvas and ask a vision-capable
   model about semantic placement/coherence issues geometry can't see.

Verification runs on a manual "Verify scene" trigger. Found issues are PROPOSED with fixes;
the user applies them (per-issue or "Fix all"). Fixes are ordinary state updates, so the
corrected scene is what later syncs to Blender. State remains the single source of truth.

## Requirements

### Requirement 1 — Deterministic geometric verification

**User story:** As a user, I want the app to catch obvious placement problems, so that my
scene is sensible before I commit it.

#### Acceptance Criteria
1. THE verifier SHALL detect FLOATING objects (an object whose base is above the floor with
   nothing supporting it).
2. THE verifier SHALL detect INTERPENETRATION (two objects' bounding boxes overlapping beyond
   a small tolerance when neither is a child/among a group).
3. THE verifier SHALL detect OUT-OF-BOUNDS objects (far outside a sane scene extent).
4. THE verifier SHALL detect INVALID/ABSURD scale (non-positive, or extreme).
5. THE verifier SHALL detect BELOW-FLOOR objects (base below y=0).
6. Each issue SHALL include: a stable key, severity, a human-readable message, the target
   object id(s), and (where applicable) a suggested fix expressed as an updateObject patch.
7. THE verifier SHALL be pure (scene in → issues out), with no side effects.

### Requirement 2 — Fix application

**User story:** As a user, I want to apply the suggested fixes, so that correcting the scene
is one click.

#### Acceptance Criteria
1. THE system SHALL apply a single issue's fix, or all fixable issues, via the existing
   `updateObject` path (state authoritative; preview updates; syncable).
2. Applying a fix SHALL NOT alter objects unrelated to that fix.
3. Issues without an automatic fix SHALL be reported (for manual correction) but not block
   the others.

### Requirement 3 — Verification UI (manual, propose-then-confirm)

**User story:** As a user, I want to run verification when I choose and see what it found,
so that I stay in control.

#### Acceptance Criteria
1. THE UI SHALL provide a "Verify scene" action (manual trigger).
2. WHEN verification runs THEN the UI SHALL list found issues with severity and message.
3. THE UI SHALL offer per-issue "Fix" and a "Fix all" action; fixes apply only on user click.
4. WHEN no issues are found THEN the UI SHALL show a clean/pass state.
5. Selecting an issue SHALL select its target object (reuse Spec 6 selection) for context.

### Requirement 4 — Vision tier (optional stretch)

**User story:** As a user, I want the AI to also judge semantic placement/coherence, so that
aesthetic problems geometry can't detect are surfaced.

#### Acceptance Criteria
1. THE system MAY capture the web canvas image and send it with the intent to a
   vision-capable model via a server route (key server-side).
2. Returned semantic issues SHALL feed the SAME propose-then-confirm flow (as advisory issues;
   fixes may be AI-suggested patches or manual).
3. IF vision is not configured/available THEN tier 1 SHALL still work fully; the UI degrades
   gracefully.

### Requirement 5 — No regressions

#### Acceptance Criteria
1. All existing tests SHALL pass; build stays clean.
2. Verification SHALL NOT auto-sync to Blender; the user syncs on demand after fixing.

## Out of scope
- Blender-side (post-sync) render verification (possible future stretch).
- Physics simulation for support detection (we use simple base/support heuristics).
