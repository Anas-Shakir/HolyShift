"use client";

import { useSceneStore } from "@/store/sceneStore";
import { OBJECT_TYPES } from "@/lib/scene/schema";
import { TransformFields } from "./TransformFields";

/**
 * ObjectPanel — lists the objects in the current scene from the Zustand store,
 * with quick add/remove controls. Reflects store changes live (Task 5).
 */
export function ObjectPanel() {
  const objects = useSceneStore((s) => s.scene.objects);
  const addObject = useSceneStore((s) => s.addObject);
  const removeObject = useSceneStore((s) => s.removeObject);
  const error = useSceneStore((s) => s.error);
  const selectedId = useSceneStore((s) => s.selectedId);
  const select = useSceneStore((s) => s.select);

  return (
    <section
      aria-label="Scene objects"
      data-testid="object-panel"
      className="flex w-64 flex-col border-r border-edge bg-panel"
    >
      <header className="border-b border-edge px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Scene
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto p-3" data-testid="object-list">
        {objects.length === 0 ? (
          <p className="text-xs text-neutral-600">No objects yet.</p>
        ) : (
          <ul className="space-y-1">
            {objects.map((o) => {
              const isSelected = o.id === selectedId;
              return (
                <li
                  key={o.id}
                  data-testid={`object-item-${o.id}`}
                  data-selected={isSelected ? "true" : "false"}
                  onClick={() => select(o.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm ${
                    isSelected
                      ? "bg-accent/20 text-white ring-1 ring-accent"
                      : "text-neutral-200 hover:bg-panel-alt"
                  }`}
                >
                  <span className="truncate">
                    {o.name}
                    <span className="ml-2 text-[10px] text-neutral-500">{o.id}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${o.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeObject(o.id);
                    }}
                    className="ml-2 shrink-0 text-neutral-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <div
          role="alert"
          data-testid="object-panel-error"
          className="border-t border-edge bg-red-950/40 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      <TransformFields />

      <div className="border-t border-edge p-3">
        <label
          htmlFor="add-object-type"
          className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500"
        >
          Add object (dev)
        </label>
        <div className="flex flex-wrap gap-1">
          {OBJECT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addObject(type)}
              className="rounded border border-edge px-2 py-1 text-[11px] text-neutral-300 hover:border-accent hover:text-white"
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
