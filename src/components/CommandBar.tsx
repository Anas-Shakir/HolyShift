"use client";

import { useState } from "react";
import { useSceneStore } from "@/store/sceneStore";
import { ScenePatchSchema } from "@/lib/agent/patch";
import { useBlenderSyncContext } from "./BlenderSyncProvider";

/**
 * CommandBar — natural-language command input wired to the AI Scene Agent.
 *
 * Sends { prompt, scene } to /api/agent, validates the returned patch, applies it to the
 * store (which updates the preview), and surfaces loading / error / clarification states.
 */
export function CommandBar() {
  const scene = useSceneStore((s) => s.scene);
  const applyAgentPatch = useSceneStore((s) => s.applyAgentPatch);
  const blender = useBlenderSyncContext();

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send() {
    const instruction = prompt.trim();
    if (!instruction || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: instruction, scene }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? `Request failed (${res.status}).`);
        return;
      }

      const parsed = ScenePatchSchema.safeParse(data.patch);
      if (!parsed.success) {
        setError("The AI returned an unexpected response.");
        return;
      }

      const { applied, errors, clarification } = applyAgentPatch(parsed.data);

      if (clarification) {
        setNotice(clarification);
      } else if (errors.length > 0) {
        setError(errors.join("; "));
      } else {
        setNotice(applied.length ? applied.join(", ") : "No changes were needed.");
        setPrompt("");
      }
    } catch {
      setError("Could not reach the AI service.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <section
      aria-label="AI command"
      data-testid="command-bar"
      className="flex flex-1 flex-col bg-panel"
    >
      <header className="border-b border-edge px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          AI Command
        </h2>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <textarea
          aria-label="Describe or modify the scene"
          placeholder='Try: "Create a desk with two monitors and a chair."  (Ctrl/Cmd+Enter to send)'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          className="min-h-24 flex-1 resize-none rounded-md border border-edge bg-panel-alt p-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || prompt.trim().length === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Thinking…" : "Send"}
          </button>
          <button
            type="button"
            onClick={() => blender.sync(scene)}
            disabled={blender.status !== "paired" || blender.syncStatus === "syncing"}
            title={
              blender.status === "paired"
                ? "Send the current scene to Blender"
                : "Connect Blender first (top-right)"
            }
            className="rounded-md border border-edge px-4 py-2 text-sm text-neutral-300 disabled:opacity-50"
          >
            {blender.syncStatus === "syncing" ? "Syncing…" : "Sync to Blender"}
          </button>
        </div>

        {blender.syncMessage && (
          <p
            data-testid="sync-message"
            className={`text-xs ${
              blender.syncStatus === "failed" ? "text-red-300" : "text-neutral-400"
            }`}
          >
            {blender.syncMessage}
          </p>
        )}

        {notice && (
          <p data-testid="command-notice" className="text-xs text-neutral-400">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" data-testid="command-error" className="text-xs text-red-300">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
