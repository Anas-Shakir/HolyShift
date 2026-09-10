"use client";

import { useEffect, useState } from "react";
import { useSceneStore } from "@/store/sceneStore";
import { isFixable } from "@/lib/verify/fixes";
import { captureCanvas } from "./preview/canvasCapture";

/**
 * VerifyPanel — manual, propose-then-confirm scene verification.
 *
 * "Verify scene" runs the deterministic geometric checks; found issues are listed with
 * severity and message. The user applies fixes per-issue or all at once (fixes are ordinary
 * updateObject patches, so the corrected scene is what later syncs to Blender). Clicking an
 * issue selects its target object for context (Spec 6 selection).
 */
export function VerifyPanel() {
  const issues = useSceneStore((s) => s.issues);
  const verified = useSceneStore((s) => s.verified);
  const verifyScene = useSceneStore((s) => s.verifyScene);
  const applyFix = useSceneStore((s) => s.applyFix);
  const applyFixAll = useSceneStore((s) => s.applyFixAll);
  const select = useSceneStore((s) => s.select);
  const addIssues = useSceneStore((s) => s.addIssues);
  const scene = useSceneStore((s) => s.scene);
  const objectCount = useSceneStore((s) => s.scene.objects.length);

  const fixableCount = issues.filter(isFixable).length;

  // Discover whether the optional AI (vision) tier is configured on the server.
  const [visionConfigured, setVisionConfigured] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/verify")
      .then((r) => r.json())
      .then((d) => {
        if (active) setVisionConfigured(Boolean(d?.configured));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function aiCheck() {
    setAiError(null);
    const image = captureCanvas();
    if (!image) {
      setAiError("Could not capture the preview.");
      return;
    }
    setAiChecking(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, scene }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error ?? "AI check failed.");
        return;
      }
      addIssues(Array.isArray(data.issues) ? data.issues : []);
    } catch {
      setAiError("Could not reach the AI verifier.");
    } finally {
      setAiChecking(false);
    }
  }

  return (
    <section
      aria-label="Scene verification"
      data-testid="verify-panel"
      className="border-t border-edge p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Verify</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => verifyScene()}
            disabled={objectCount === 0}
            className="rounded bg-accent px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
          >
            Verify scene
          </button>
          {visionConfigured && (
            <button
              type="button"
              onClick={() => void aiCheck()}
              disabled={objectCount === 0 || aiChecking}
              title="Ask the AI to review placement in the preview"
              className="rounded border border-edge px-2.5 py-1 text-[11px] text-neutral-300 hover:border-accent hover:text-white disabled:opacity-50"
            >
              {aiChecking ? "Checking…" : "AI check"}
            </button>
          )}
        </div>
      </div>

      {aiError && (
        <p role="alert" className="mb-1 text-[11px] text-red-300">
          {aiError}
        </p>
      )}

      {verified && issues.length === 0 && (
        <p data-testid="verify-clean" className="text-[11px] text-green-400">
          No issues found.
        </p>
      )}

      {issues.length > 0 && (
        <>
          <ul className="space-y-1" data-testid="verify-issues">
            {issues.map((issue) => (
              <li
                key={issue.key}
                data-testid={`issue-${issue.key}`}
                onClick={() => issue.objectIds[0] && select(issue.objectIds[0])}
                className="flex cursor-pointer items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-panel-alt"
              >
                <span className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      issue.severity === "error" ? "bg-red-400" : "bg-yellow-400"
                    }`}
                  />
                  <span className="text-[11px] text-neutral-300">{issue.message}</span>
                </span>
                {isFixable(issue) && (
                  <button
                    type="button"
                    aria-label={`Fix ${issue.key}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      applyFix(issue.key);
                    }}
                    className="shrink-0 rounded border border-edge px-2 py-0.5 text-[10px] text-neutral-300 hover:border-accent hover:text-white"
                  >
                    Fix
                  </button>
                )}
              </li>
            ))}
          </ul>

          {fixableCount > 0 && (
            <button
              type="button"
              onClick={() => applyFixAll()}
              className="mt-2 w-full rounded border border-edge px-2 py-1 text-[11px] text-neutral-300 hover:border-accent hover:text-white"
            >
              Fix all ({fixableCount})
            </button>
          )}
        </>
      )}
    </section>
  );
}
