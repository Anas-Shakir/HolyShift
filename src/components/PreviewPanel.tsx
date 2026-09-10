"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSceneStore } from "@/store/sceneStore";
import { PreviewErrorBoundary } from "./preview/PreviewErrorBoundary";
import type { GizmoMode } from "./preview/SceneCanvas";

/**
 * PreviewPanel — hosts the 3D preview and the gizmo mode toolbar.
 *
 * The R3F canvas is imported client-only (ssr:false): Three.js/WebGL cannot run during
 * SSR, and this avoids hydration mismatches. An empty-state hint shows when the scene has
 * no objects; a PreviewErrorBoundary keeps a render failure from taking down the app.
 */
const SceneCanvas = dynamic(
  () => import("./preview/SceneCanvas").then((m) => m.SceneCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        data-testid="preview-loading"
        className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-neutral-600"
      >
        Loading preview…
      </div>
    ),
  },
);

const MODES: { mode: GizmoMode; label: string; key: string }[] = [
  { mode: "translate", label: "Move", key: "W" },
  { mode: "rotate", label: "Rotate", key: "E" },
  { mode: "scale", label: "Scale", key: "R" },
];

export function PreviewPanel() {
  const objectCount = useSceneStore((s) => s.scene.objects.length);
  const selectedId = useSceneStore((s) => s.selectedId);
  const deselect = useSceneStore((s) => s.deselect);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>("translate");

  // Keyboard shortcuts: W/E/R switch gizmo mode; Escape deselects.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // don't hijack typing
      if (e.key === "Escape") deselect();
      else if (e.key === "w" || e.key === "W") setGizmoMode("translate");
      else if (e.key === "e" || e.key === "E") setGizmoMode("rotate");
      else if (e.key === "r" || e.key === "R") setGizmoMode("scale");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deselect]);

  return (
    <section
      aria-label="3D preview"
      data-testid="preview-panel"
      className="relative flex flex-1 items-center justify-center border-b border-edge bg-[#0b0d12]"
    >
      <div className="absolute inset-0">
        <PreviewErrorBoundary>
          <SceneCanvas gizmoMode={gizmoMode} />
        </PreviewErrorBoundary>
      </div>

      {/* Gizmo mode toolbar (shown when an object is selected) */}
      {selectedId && (
        <div
          data-testid="gizmo-toolbar"
          className="absolute left-3 top-3 z-10 flex gap-1 rounded-md border border-edge bg-panel/90 p-1 backdrop-blur"
        >
          {MODES.map(({ mode, label, key }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setGizmoMode(mode)}
              title={`${label} (${key})`}
              className={`rounded px-2 py-1 text-[11px] ${
                gizmoMode === mode
                  ? "bg-accent text-white"
                  : "text-neutral-300 hover:bg-panel-alt"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {objectCount === 0 && (
        <div
          data-testid="preview-empty"
          className="pointer-events-none z-10 select-none text-center"
        >
          <p className="text-sm uppercase tracking-widest text-neutral-500">Empty scene</p>
          <p className="mt-2 max-w-sm text-xs text-neutral-600">
            Add an object from the Scene panel, or describe one in the command bar.
          </p>
        </div>
      )}
    </section>
  );
}
