# Tasks — Direct Manipulation

**Spec 6 of 8.** TDD for state/commit/numeric logic; gizmo drag + raycast selection verified
in-browser.

- [ ] 1. Selection state + two-way panel highlight
  - store: selectedId + select/deselect; clear on remove of selected.
  - ObjectPanel rows clickable + highlighted when selected.
  - Tests: select/deselect; clear-on-remove; panel highlight.
  - _Requirements: 1.1, 1.2, 2.2, 2.3_

- [ ] 2. Viewport selection (raycast) + highlight + deselect
  - SceneObjectView onClick → select; selection highlight; Canvas onPointerMissed → deselect; Escape.
  - _Requirements: 2.1, 2.3, 2.4_

- [ ] 3. TransformControls gizmo
  - drei TransformControls attached to selected object; translate/rotate/scale modes (W/E/R + buttons);
    disable OrbitControls while dragging; commit transform on drag-end via updateObject.
  - Pure commit helper (object3D-like → updateObject args) unit-tested.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Numeric transform inputs (Option C)
  - TransformFields in ObjectPanel for selected object (pos/rot/scale; rotation in degrees).
  - Edits → updateObject; controlled from store; guard invalid input.
  - Tests: inputs render for selection; edit calls updateObject with merged vector.
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Verify end-to-end
  - Full suite (136 pass / 18 files) + build clean + dev boot (1738 modules, GET / 200, no errors).
  - In-browser gizmo/selection drag check: user-confirmed.
  - _Requirements: 5.1, 5.2_

## Status

**Spec 6 complete (pending in-browser gizmo confirmation).** 136 web tests / 18 files;
build clean; dev boots cleanly. Selection (viewport + panel, two-way), the
translate/rotate/scale gizmo (drei TransformControls, orbit disabled while dragging,
commit-on-release via updateObject), keyboard W/E/R + Escape, and precise numeric
position/rotation/scale inputs are all wired. State stays authoritative — every edit is an
updateObject call, so preview + Blender sync flow unchanged.

The gizmo/selection are GL-interactive, so the automated tests cover the state side
(selection, commit-to-store helper, numeric inputs incl. deg->rad). The actual drag feel
(clicking to select, dragging handles, orbit not fighting the gizmo) is the one thing to
confirm in the browser.

### To deploy
Redeploy the web app (Vercel). No relay or Blender add-on changes.
