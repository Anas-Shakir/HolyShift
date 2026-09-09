import { z } from "zod";
import { SceneSchema } from "@/lib/scene/schema";

/**
 * Shared sync protocol — the message contract between the web app, the relay, and the
 * Blender add-on. The web side validates messages with these Zod schemas; the relay and
 * add-on mirror the same shapes.
 *
 * Transport: JSON over WebSocket. `type` is the discriminator.
 */

/** Role of a connecting client. */
export const RoleSchema = z.enum(["web", "blender"]);
export type Role = z.infer<typeof RoleSchema>;

/** Client → relay: announce role + pairing code to join/form a session. */
export const HelloSchema = z.object({
  type: z.literal("hello"),
  role: RoleSchema,
  code: z.string().min(1),
});

/** Relay → client: a session formed (both roles present). */
export const PairedSchema = z.object({
  type: z.literal("paired"),
  role: RoleSchema, // the peer's role
});

/** Relay → client: the other member left. */
export const PeerLeftSchema = z.object({ type: z.literal("peer_left") });

/** Web → Blender: apply this full scene. */
export const SyncSchema = z.object({
  type: z.literal("sync"),
  scene: SceneSchema,
});

/** Blender → web: result of a sync. */
export const SyncResultSchema = z.object({
  type: z.literal("sync_result"),
  ok: z.boolean(),
  summary: z.string().optional(),
  error: z.string().optional(),
});

/** Either direction: a controlled error. */
export const ErrorMessageSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

/** Keep-alive. */
export const PingSchema = z.object({ type: z.literal("ping") });
export const PongSchema = z.object({ type: z.literal("pong") });

/** Any protocol message. */
export const MessageSchema = z.discriminatedUnion("type", [
  HelloSchema,
  PairedSchema,
  PeerLeftSchema,
  SyncSchema,
  SyncResultSchema,
  ErrorMessageSchema,
  PingSchema,
  PongSchema,
]);
export type Message = z.infer<typeof MessageSchema>;
export type HelloMessage = z.infer<typeof HelloSchema>;
export type SyncMessage = z.infer<typeof SyncSchema>;
export type SyncResultMessage = z.infer<typeof SyncResultSchema>;

/** Parse an unknown value (or JSON string) into a validated Message, or return null. */
export function parseMessage(input: unknown): Message | null {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return null;
    }
  }
  const result = MessageSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Serialize a message to a JSON string for the wire. */
export function serializeMessage(message: Message): string {
  return JSON.stringify(message);
}

/** Generate a short, human-friendly pairing code (e.g. "H7K2"). */
export function generatePairingCode(): string {
  // Avoid ambiguous chars (0/O, 1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
