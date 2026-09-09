"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Scene } from "@/lib/scene/schema";
import {
  parseMessage,
  serializeMessage,
  generatePairingCode,
  type SyncResultMessage,
} from "./protocol";

/**
 * useBlenderSync — manages the relay WebSocket for the web side of Blender sync.
 *
 * The web app connects OUTBOUND to the relay with a pairing code; the user enters the same
 * code in the Blender add-on. Once both are present the relay reports "paired". "Sync to
 * Blender" sends the full scene and resolves when Blender returns a sync_result.
 *
 * State machine:
 *   disconnected → connecting → waiting_for_blender → paired
 *   (any) → error;  peer_left → waiting_for_blender
 */

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "waiting_for_blender"
  | "paired"
  | "error";

export type SyncStatus = "idle" | "syncing" | "success" | "failed";

export interface BlenderSyncState {
  configured: boolean;
  status: ConnectionStatus;
  code: string;
  error: string | null;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  connect: (code?: string) => void;
  disconnect: () => void;
  sync: (scene: Scene) => void;
}

const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL ?? "";

export function useBlenderSync(): BlenderSyncState {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingSync = useRef<boolean>(false);

  const configured = RELAY_URL.length > 0;

  const disconnect = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    setStatus("disconnected");
    pendingSync.current = false;
  }, []);

  const connect = useCallback(
    (explicitCode?: string) => {
      if (!configured) {
        setStatus("error");
        setError("Blender sync is not configured (missing NEXT_PUBLIC_RELAY_URL).");
        return;
      }
      // Reuse the existing code (e.g. reconnect) or generate a fresh one.
      const pairingCode = (explicitCode ?? code) || generatePairingCode();
      setCode(pairingCode);
      setError(null);
      setStatus("connecting");

      let ws: WebSocket;
      try {
        ws = new WebSocket(RELAY_URL);
      } catch {
        setStatus("error");
        setError("Could not open a connection to the relay.");
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(serializeMessage({ type: "hello", role: "web", code: pairingCode }));
        setStatus("waiting_for_blender");
      };

      ws.onmessage = (event) => {
        const msg = parseMessage(event.data);
        if (!msg) return;
        switch (msg.type) {
          case "paired":
            setStatus("paired");
            break;
          case "peer_left":
            setStatus("waiting_for_blender");
            break;
          case "sync_result": {
            const r = msg as SyncResultMessage;
            pendingSync.current = false;
            setSyncStatus(r.ok ? "success" : "failed");
            setSyncMessage(r.ok ? r.summary ?? "Synced." : r.error ?? "Sync failed.");
            break;
          }
          case "error":
            setError(msg.message);
            break;
          case "ping":
            ws.send(serializeMessage({ type: "pong" }));
            break;
          default:
            break;
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError("Relay connection error.");
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          setStatus((prev) => (prev === "error" ? prev : "disconnected"));
        }
      };
    },
    [configured, code],
  );

  const sync = useCallback((scene: Scene) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) {
      setSyncStatus("failed");
      setSyncMessage("Not connected to the relay.");
      return;
    }
    pendingSync.current = true;
    setSyncStatus("syncing");
    setSyncMessage(null);
    ws.send(serializeMessage({ type: "sync", scene }));
  }, []);

  // Clean up the socket on unmount.
  useEffect(() => {
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return {
    configured,
    status,
    code,
    error,
    syncStatus,
    syncMessage,
    connect,
    disconnect,
    sync,
  };
}
