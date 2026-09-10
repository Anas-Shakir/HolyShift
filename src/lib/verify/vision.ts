import "server-only";
import { z } from "zod";
import type { Issue } from "./types";
import type { Scene } from "@/lib/scene/schema";

/**
 * Optional vision tier (server-only): send a snapshot of the web preview + a compact scene
 * summary to a Groq vision-capable model and ask for SEMANTIC placement/coherence issues that
 * the deterministic geometric tier can't see (e.g. "the desk faces away from the chair").
 *
 * Gated on GROQ_VISION_MODEL being set (e.g. meta-llama/llama-4-scout-17b-16e-instruct). If
 * unset, callers skip this tier and tier 1 still works fully.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Whether the vision tier is configured on the server. */
export function isVisionConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_VISION_MODEL);
}

/** Shape the model is asked to return (advisory semantic issues). */
const VisionIssueSchema = z.object({
  message: z.string(),
  severity: z.enum(["error", "warning"]).default("warning"),
  objectIds: z.array(z.string()).default([]),
});
const VisionResponseSchema = z.object({
  issues: z.array(VisionIssueSchema).default([]),
});

/** A compact, token-cheap description of the scene for the model. */
function summarizeScene(scene: Scene): string {
  const objs = scene.objects
    .map(
      (o) =>
        `${o.id} (${o.type}) at [${o.transform.position.map((n) => n.toFixed(2)).join(", ")}]`,
    )
    .join("; ");
  return `Objects: ${objs || "none"}.`;
}

export interface VisionRequest {
  imageDataUrl: string; // "data:image/png;base64,..."
  intent?: string; // what the user asked for, if known
  scene: Scene;
}

/**
 * Ask the vision model for semantic issues. Returns Issue[] (kind "semantic", advisory —
 * no automatic fix). Never throws for "no issues"; throws only on a hard request failure.
 */
export async function verifyWithVision(req: VisionRequest): Promise<Issue[]> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_VISION_MODEL;
  if (!apiKey || !model) return [];

  const system = [
    "You are a 3D scene placement reviewer. You are shown a rendered preview of a scene and a",
    "list of its objects. Point out SEMANTIC placement or coherence problems a person would",
    "notice: things facing the wrong way, implausible arrangements, an object at a wrong scale",
    "relative to others, or items that don't belong. Do NOT report exact numeric coordinates.",
    'Return ONLY JSON: {"issues":[{"message": str, "severity":"warning"|"error", "objectIds":[ids]}]}.',
    "If the scene looks fine, return an empty issues array.",
  ].join(" ");

  const user = [
    req.intent ? `The user asked for: ${req.intent}.` : "",
    summarizeScene(req.scene),
    "Review the preview image and list any semantic placement issues.",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image_url", image_url: { url: req.imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Vision request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return [];
  }
  const parsed = VisionResponseSchema.safeParse(raw);
  if (!parsed.success) return [];

  return parsed.data.issues.map((vi, i) => ({
    key: `semantic:${i}`,
    severity: vi.severity,
    kind: "semantic" as const,
    message: vi.message,
    objectIds: vi.objectIds,
    // Semantic issues are advisory; the user fixes them with the gizmo/AI.
  }));
}
