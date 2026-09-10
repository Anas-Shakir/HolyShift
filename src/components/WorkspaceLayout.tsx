import { PreviewPanel } from "./PreviewPanel";
import { ObjectPanel } from "./ObjectPanel";
import { CommandBar } from "./CommandBar";
import { JsonInspector } from "./JsonInspector";
import { SceneToolbar } from "./SceneToolbar";
import { BlenderSyncProvider } from "./BlenderSyncProvider";
import { BlenderConnect } from "./BlenderConnect";

/**
 * WorkspaceLayout — three full-height columns under the header:
 *   - Left sidebar: Scene panel (object list + transform inspector)
 *   - Center: 3D preview (fills remaining space)
 *   - Right sidebar: AI command + JSON inspector
 *
 * Side panels scroll independently so the inspector and dev state are always reachable.
 */
export function WorkspaceLayout() {
  return (
    <BlenderSyncProvider>
      <main
        data-testid="workspace-layout"
        className="flex h-screen w-screen flex-col overflow-hidden"
      >
        <header className="flex items-center gap-2 border-b border-edge bg-panel px-4 py-2">
          <span className="text-sm font-semibold text-neutral-100">
            AI 3D Scene Prototyper
          </span>
          <span className="text-xs text-neutral-500">for Blender</span>
          <div className="ml-auto flex items-center gap-4">
            <BlenderConnect />
            <SceneToolbar />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left sidebar: scene objects + transform inspector */}
          <ObjectPanel />

          {/* Center: 3D preview */}
          <PreviewPanel />

          {/* Right sidebar: AI command (top) + JSON inspector (bottom) */}
          <aside className="flex w-80 shrink-0 flex-col border-l border-edge">
            <CommandBar />
            <JsonInspector />
          </aside>
        </div>
      </main>
    </BlenderSyncProvider>
  );
}
