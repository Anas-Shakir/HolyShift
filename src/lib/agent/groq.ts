import "server-only";
import { ScenePatchSchema, type ScenePatch } from "./patch";
import { SCENE_PATCH_JSON_SCHEMA, SCENE_PATCH_SCHEMA_NAME } from "./patchSchema";
import { buildSystemPrompt, repairNote } from "./prompt";
import type { Scene } from "@/lib/scene/schema";

/**
 * Server-only Groq client for the Scene Agent.
 *
 * The JSON Schema used for Groq strict output is intentionally looser than the Zod schema
 * (nullable everywhere, every op carries all fields) because constrained decoding needs
 * fixed required keys. `normalizePatch` converts that raw shape into the strict Zod shape:
 * it drops nulls and narrows each operation to only the fields its `op` uses.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

/** Remove null/undefined entries from a shallow object. */
function dropNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/** Narrow a raw target object { id, type, ordinal } (nullable) into the Zod target shape. */
function normalizeTarget(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const t = raw as Record<string, unknown>;
  if (t.id != null) return { id: t.id };
  if (t.type != null) {
    return t.ordinal != null ? { type: t.type, ordinal: t.ordinal } : { type: t.type };
  }
  return {};
}

/** Narrow a raw create/update field bundle, dropping nulls (incl. nested material). */
function normalizeFields(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const cleaned = dropNulls(raw as Record<string, unknown>);
  if (cleaned.material && typeof cleaned.material === "object") {
    cleaned.material = dropNulls(cleaned.material as Record<string, unknown>);
  }
  return cleaned;
}

/** Convert one raw operation (all-fields, nullable) into the strict discriminated shape. */
function normalizeOperation(raw: Record<string, unknown>): Record<string, unknown> | null {
  switch (raw.op) {
    case "create":
      return { op: "create", object: normalizeFields(raw.object) };
    case "update":
      return { op: "update", target: normalizeTarget(raw.target), changes: normalizeFields(raw.changes) };
    case "delete":
      return { op: "delete", target: normalizeTarget(raw.target) };
    case "setEnvironment":
      return { op: "setEnvironment", changes: normalizeFields(raw.changes) };
    case "addLight":
      return { op: "addLight", light: normalizeFields(raw.light) };
    case "removeLight":
      return { op: "removeLight", id: raw.id };
    default:
      return null;
  }
}

/**
 * Normalize the raw model JSON (nullable/all-fields shape) into a ScenePatch-shaped object
 * ready for Zod validation. Pure and exported for testing.
 */
export function normalizePatch(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  const ops = Array.isArray(r.operations) ? r.operations : [];
  const operations = ops
    .map((o) => (o && typeof o === "object" ? normalizeOperation(o as Record<string, unknown>) : null))
    .filter((o): o is Record<string, unknown> => o !== null);
  const out: Record<string, unknown> = { operations };
  if (r.clarification != null && r.clarification !== "") out.clarification = r.clarification;
  return out;
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Low-level call to Groq chat completions with strict structured output. */
async function callGroq(apiKey: string, model: string, messages: GroqMessage[]): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: SCENE_PATCH_SCHEMA_NAME,
          strict: true,
          schema: SCENE_PATCH_JSON_SCHEMA,
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no content.");
  return content;
}

/** Parse + normalize + validate a raw content string into a ScenePatch. */
function parsePatch(content: string): ScenePatch {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Model output was not valid JSON.");
  }
  const normalized = normalizePatch(raw);
  const result = ScenePatchSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(
      result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return result.data;
}

export interface RequestPatchOptions {
  apiKey?: string;
  model?: string;
}

/**
 * Ask the Scene Agent for a patch given the current scene and a user instruction.
 * Validates output; on failure, retries ONCE with a repair note; then throws.
 */
export async function requestPatch(
  scene: Scene,
  instruction: string,
  opts: RequestPatchOptions = {},
): Promise<ScenePatch> {
  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("AI is not configured (missing GROQ_API_KEY).");
  const model = opts.model ?? process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  const messages: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt(scene) },
    { role: "user", content: instruction },
  ];

  try {
    return parsePatch(await callGroq(apiKey, model, messages));
  } catch (firstErr) {
    // one repair attempt
    const note = repairNote(firstErr instanceof Error ? firstErr.message : String(firstErr));
    const repaired: GroqMessage[] = [...messages, { role: "user", content: note }];
    return parsePatch(await callGroq(apiKey, model, repaired));
  }
}
