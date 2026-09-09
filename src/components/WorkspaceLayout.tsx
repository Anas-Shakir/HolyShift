import { PreviewPanel } from "./PreviewPanel";
import { ObjectPanel } from "./ObjectPanel";
import { CommandBar } from "./CommandBar";
import { JsonInspector } from "./JsonInspector";
import { SceneToolbar } from "./SceneToolbar";

/**
 * WorkspaceLayout — the three-region workspace shell:
 *   - PreviewPanel (top): 3D preview area
 *   - ObjectPanel (bottom-left): scene/object list
 *   - CommandBar (bottom-right): AI command input
 */
export function WorkspaceLayout() {
  return (
    <main
      data-testid="workspace-layout"
      className="flex h-screen w-screen flex-col overflow-hidden"
    >
      <header className="flex items-center gap-2 border-b border-edge bg-panel px-4 py-2">
        <span className="text-sm font-semibold text-neutral-100">
          AI 3D Scene Prototyper
        </span>
        <span className="text-xs text-neutral-500">for Blender</span>
        <div className="ml-auto">
          <SceneToolbar />
        </div>
      </header>

      <PreviewPanel />

      <div className="flex h-72 shrink-0">
        <ObjectPanel />
        <div className="flex flex-1 flex-col">
          <CommandBar />
          <JsonInspector />
        </div>
      </div>
    </main>
  );
}
