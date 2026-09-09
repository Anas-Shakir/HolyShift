"use client";

import { useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/store/sceneStore";
import { initScenePersistence } from "@/store/sceneStore";
import { serialize, deserialize } from "@/lib/scene/serialize";

/**
 * SceneToolbar — header controls for the scene:
 *  - initializes localStorage persistence on mount (hydrate + save-on-change),
 *  - exports the current scene to a downloaded JSON file,
 *  - imports a scene JSON file (validated).
 */
export function SceneToolbar() {
  const scene = useSceneStore((s) => s.scene);
  const replaceScene = useSceneStore((s) => s.replaceScene);
  const resetScene = useSceneStore((s) => s.resetScene);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate from storage and persist on change; unsubscribe on unmount.
    const unsubscribe = initScenePersistence();
    return unsubscribe;
  }, []);

  function exportScene() {
    const blob = new Blob([serialize(scene)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scene.metadata.name || "scene"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importScene(file: File) {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = deserialize(text); // validates + version-checks
      replaceScene(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex items-center gap-2" data-testid="scene-toolbar">
      <button
        type="button"
        onClick={exportScene}
        className="rounded border border-edge px-2 py-1 text-[11px] text-neutral-300 hover:text-white"
      >
        Export
      </button>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="rounded border border-edge px-2 py-1 text-[11px] text-neutral-300 hover:text-white"
      >
        Import
      </button>
      <button
        type="button"
        onClick={() => resetScene()}
        className="rounded border border-edge px-2 py-1 text-[11px] text-neutral-400 hover:text-white"
      >
        New
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Import scene JSON"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importScene(file);
          e.target.value = "";
        }}
      />
      {importError && (
        <span role="alert" className="text-[11px] text-red-300">
          {importError}
        </span>
      )}
    </div>
  );
}
