"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useBlenderSync, type BlenderSyncState } from "@/lib/sync/useBlenderSync";

/**
 * Shares one Blender-sync connection across the app so the header connect panel and the
 * command bar's "Sync to Blender" button operate on the same WebSocket.
 */
const BlenderSyncContext = createContext<BlenderSyncState | null>(null);

export function BlenderSyncProvider({ children }: { children: ReactNode }) {
  const sync = useBlenderSync();
  return <BlenderSyncContext.Provider value={sync}>{children}</BlenderSyncContext.Provider>;
}

export function useBlenderSyncContext(): BlenderSyncState {
  const ctx = useContext(BlenderSyncContext);
  if (!ctx) throw new Error("useBlenderSyncContext must be used within BlenderSyncProvider");
  return ctx;
}
