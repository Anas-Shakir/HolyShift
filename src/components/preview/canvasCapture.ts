/**
 * Tiny registry so non-canvas components (e.g. VerifyPanel) can grab a PNG snapshot of the
 * live R3F canvas without prop-drilling through the dynamic import. SceneCanvas registers
 * its WebGL canvas element; captureCanvas() reads a data URL from it.
 */

let canvasEl: HTMLCanvasElement | null = null;

export function registerCanvas(el: HTMLCanvasElement | null): void {
  canvasEl = el;
}

/**
 * Return a PNG data URL of the current preview, or null if unavailable.
 * Note: the WebGL context must be preserve-drawing-buffer OR read synchronously after a
 * render; R3F renders on demand, so we request a frame read via toDataURL right away.
 */
export function captureCanvas(): string | null {
  if (!canvasEl) return null;
  try {
    return canvasEl.toDataURL("image/png");
  } catch {
    return null;
  }
}
