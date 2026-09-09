"use client";

import { useBlenderSyncContext } from "./BlenderSyncProvider";

/**
 * BlenderConnect — header control to connect the site to a local Blender via the relay.
 * Shows a pairing code the user pastes into the Blender add-on, plus connection status.
 */
const STATUS_LABEL: Record<string, string> = {
  disconnected: "Not connected",
  connecting: "Connecting…",
  waiting_for_blender: "Waiting for Blender",
  paired: "Blender connected",
  error: "Connection error",
};

export function BlenderConnect() {
  const { configured, status, code, error, connect, disconnect } = useBlenderSyncContext();

  if (!configured) {
    return (
      <span
        data-testid="blender-unconfigured"
        className="text-[11px] text-neutral-600"
        title="Set NEXT_PUBLIC_RELAY_URL to enable Blender sync"
      >
        Blender sync not configured
      </span>
    );
  }

  const connected = status !== "disconnected" && status !== "error";

  return (
    <div className="flex items-center gap-2" data-testid="blender-connect">
      <span
        className={`h-2 w-2 rounded-full ${
          status === "paired"
            ? "bg-green-400"
            : status === "error"
              ? "bg-red-400"
              : connected
                ? "bg-yellow-400"
                : "bg-neutral-600"
        }`}
      />
      <span className="text-[11px] text-neutral-400" data-testid="blender-status">
        {STATUS_LABEL[status] ?? status}
      </span>

      {connected && code && (
        <span className="rounded bg-panel-alt px-2 py-0.5 font-mono text-[11px] text-accent">
          {code}
        </span>
      )}

      {connected ? (
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded border border-edge px-2 py-1 text-[11px] text-neutral-300 hover:text-white"
        >
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          onClick={() => connect()}
          className="rounded border border-edge px-2 py-1 text-[11px] text-neutral-300 hover:border-accent hover:text-white"
        >
          Connect Blender
        </button>
      )}

      {error && (
        <span role="alert" className="text-[11px] text-red-300">
          {error}
        </span>
      )}
    </div>
  );
}
