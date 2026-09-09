import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviewPanel } from "./PreviewPanel";
import { useSceneStore } from "@/store/sceneStore";
import { createEmptyScene } from "@/lib/scene/factory";

beforeEach(() => {
  useSceneStore.setState({ scene: createEmptyScene(), status: "idle", error: null });
});

describe("PreviewPanel", () => {
  it("mounts the preview region without throwing", () => {
    render(<PreviewPanel />);
    expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
  });

  it("shows the empty-state hint when there are no objects", () => {
    render(<PreviewPanel />);
    expect(screen.getByTestId("preview-empty")).toBeInTheDocument();
  });

  it("hides the empty-state hint once an object exists", () => {
    useSceneStore.getState().addObject("cube");
    render(<PreviewPanel />);
    expect(screen.queryByTestId("preview-empty")).not.toBeInTheDocument();
  });
});
