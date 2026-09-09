import { NextResponse } from "next/server";
import { z } from "zod";
import { SceneSchema } from "@/lib/scene/schema";
import { requestPatch } from "@/lib/agent/groq";

/**
 * POST /api/agent
 * Body: { prompt: string, scene: Scene }
 * Returns: { patch: ScenePatch } | { error: string }
 *
 * The Groq API key is read server-side only and never sent to the client.
 */

export const runtime = "nodejs";

const RequestSchema = z.object({
  prompt: z.string().min(1),
  scene: SceneSchema,
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request: " + parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Set GROQ_API_KEY on the server." },
      { status: 503 },
    );
  }

  try {
    const patch = await requestPatch(parsed.data.scene, parsed.data.prompt);
    return NextResponse.json({ patch });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent request failed." },
      { status: 502 },
    );
  }
}
