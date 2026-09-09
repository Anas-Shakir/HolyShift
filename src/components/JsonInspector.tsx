"use client";

import { useEffect, useState } from "react";
import { useSceneStore } from "@/store/sceneStore";
import { serialize } from "@/lib/scene/serialize";

/**
 * JsonInspector — dev-only view/edit of the raw scene state.
 *
 * This is the manual driver for the world until the AI Scene Agent exists (Spec 3),
 * and a permanent debugging aid. Editing the JSON and clicking Apply replaces the scene
 * (validated); invalid JSON/schema shows an inline error and never crashes the app.
 */
export function JsonInspector() {
  const scene = useSceneStore((s) => s.scene);
  const replaceScene = useSceneStore((s) => s.replaceScene);
  const storeError = useSceneStore((s) => s.error);

  const [draft, setDraft] = useState<string>(() => serialize(scene));
  const [localError, setLocalError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Keep the draft in sync with the store when the user is not mid-edit.
  useEffect(() => {
    if (!dirty) setDraft(serialize(scene));
  }, [scene, dirty]);

  function apply() {
    setLocalError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setLocalError("Invalid JSON syntax.");
      return;
    }
    // replaceScene validates against the schema; surface any error locally too.
    try {
      replaceScene(parsed as never);
      setDirty(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }

  const shownError = localError ?? storeError;

  return (
    <section
      aria-label="JSON inspector"
      data-testid="json-inspector"
      className="flex flex-col border-t border-edge bg-panel"
    >
      <header className="flex items-center justify-between border-b border-edge px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          State (dev)
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(serialize(scene));
              setDirty(false);
              setLocalError(null);
            }}
            className="rounded border border-edge px-2 py-1 text-[11px] text-neutral-400 hover:text-white"
          >
            Revert
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded bg-accent px-3 py-1 text-[11px] font-medium text-white"
          >
            Apply
          </button>
        </div>
      </header>

      <textarea
        aria-label="Scene JSON"
        data-testid="json-inspector-textarea"
        spellCheck={false}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        className="h-40 w-full resize-none bg-[#0b0d12] p-3 font-mono text-[11px] leading-relaxed text-neutral-300 focus:outline-none"
      />

      {shownError && (
        <div
          role="alert"
          data-testid="json-inspector-error"
          className="border-t border-edge bg-red-950/40 px-3 py-2 text-xs text-red-300"
        >
          {shownError}
        </div>
      )}
    </section>
  );
}
