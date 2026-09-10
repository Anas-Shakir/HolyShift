import { NextResponse } from "next/server";
import { z } from "zod";
import { SceneSchema } from "@/lib/scene/schema";
import { verifyWithVision, isVisionConfigured } from "@/lib/verify/vision";

/**
 * POST /api/verify  (optional vision tier)
 * Body: { image: dataUrl, scene: Scene, intent?: string }
 * Returns: { issues: Issue[] } | { error }
 *
 * The Groq key + vision model id are server-side only. If vision is not configured the route
 * returns an empty issues array so the client's deterministic tier is unaffected.
 */

export const runtime = "nodejs";

const RequestSchema = z.object({
  image: z.string().startsWith("data:image/"),
  scene: SceneSchema,
  intent: z.string().optional(),
});

export async function GET() {
  // Lets the client discover whether the vision tier is available.
  return NextResponse.json({ configured: isVisionConfigured() });
}

export async function POST(request: Request) {
  if (!isVisionConfigured()) {
    return NextResponse.json({ issues: [] });
  }

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

  try {
    const issues = await verifyWithVision({
      imageDataUrl: parsed.data.image,
      scene: parsed.data.scene,
      intent: parsed.data.intent,
    });
    return NextResponse.json({ issues });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Vision verification failed." },
      { status: 502 },
    );
  }
}
