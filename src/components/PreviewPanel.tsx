"use client";

import dynamic from "next/dynamic";
import { useSceneStore } from "@/store/sceneStore";
import { PreviewErrorBoundary } from "./preview/PreviewErrorBoundary";

/**
 * PreviewPanel — hosts the 3D preview.
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

export function PreviewPanel() {
  const objectCount = useSceneStore((s) => s.scene.objects.length);

  return (
    <section
      aria-label="3D preview"
      data-testid="preview-panel"
      className="relative flex flex-1 items-center justify-center border-b border-edge bg-[#0b0d12]"
    >
      <div className="absolute inset-0">
        <PreviewErrorBoundary>
          <SceneCanvas />
        </PreviewErrorBoundary>
      </div>

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
