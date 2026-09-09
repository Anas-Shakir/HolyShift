"use client";

import { Component, type ReactNode } from "react";

/**
 * Catches render errors from the 3D canvas so a GL/render failure shows a safe fallback
 * instead of crashing the whole app (panels + inspector stay usable).
 */
export class PreviewErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          data-testid="preview-error"
          className="flex h-full w-full flex-col items-center justify-center gap-2 text-center"
        >
          <p className="text-sm text-red-300">3D preview failed to render.</p>
          <p className="max-w-sm text-xs text-neutral-500">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
