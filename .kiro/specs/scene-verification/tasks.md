# Tasks — Scene Verification & Self-Correction

**Spec 7 of 8.** Pre-sync web verification. TDD for geometry + fixes; vision tier optional.

- [ ] 1. Deterministic geometric verifier (pure)
  - lib/verify/types.ts (Issue/Severity/Fix), lib/verify/boxes.ts (aabb + overlap),
    lib/verify/geometry.ts (below_floor, floating, interpenetration, out_of_bounds, bad_scale).
  - Each issue carries a suggested updateObject fix where applicable.
  - Tests: aabb math; each check with crafted scenes.
  - _Requirements: 1.1–1.7_

- [ ] 2. Fix application + store wiring
  - lib/verify/fixes.ts (applyFix / applyFixes via operations).
  - store: issues, verifyScene(), applyFix(key), applyFixAll().
  - Tests: drop-to-floor fix; fix-all; unrelated untouched; store populate/clear.
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Verify UI (manual, propose-then-confirm)
  - VerifyPanel: "Verify scene" button, issue list (severity + message), Fix / Fix all,
    clean state; clicking issue selects target.
  - Tests: renders issues, Fix/Fix-all call store, clean state.
  - _Requirements: 3.1–3.5_

- [ ] 4. Vision tier (optional stretch)
  - canvas capture (toDataURL) + /api/verify (Groq vision, server key) → semantic issues merged.
  - Gated on availability; tier 1 unaffected if absent.
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. End-to-end verification
  - Full suite (158 pass / 21 files) + build clean (/api/agent + /api/verify dynamic) + dev
    boot (GET / 200, /api/verify GET configured=false with no vision model set).
  - _Requirements: 5.1, 5.2_

## Status

**Spec 7 complete.** Pre-sync, web-preview verification with two tiers:
- Tier 1 (deterministic, always on): floating / below-floor / interpenetration / out-of-bounds
  / bad-scale checks on the structured state, each with a one-click fix (drop-to-floor, lift,
  reset-scale) applied via updateObject. Manual "Verify scene" trigger; propose-then-confirm
  (per-issue "Fix" + "Fix all"); clicking an issue selects its object.
- Tier 2 (vision, optional/gated): "AI check" captures the preview canvas and asks a Groq
  vision model (meta-llama/llama-4-scout... via GROQ_VISION_MODEL) for semantic placement
  issues, merged into the same list. Hidden unless GROQ_VISION_MODEL is configured.

All fixes are state edits, so the corrected scene is what later syncs to Blender (manual sync).
158 tests / 21 files; build clean.

### To enable the optional AI vision check
Set `GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct` (plus the existing
GROQ_API_KEY) in the web env. Without it, tier 1 works fully and the AI-check button is hidden.

### To deploy
Redeploy the web app (Vercel). No relay or Blender add-on changes.
