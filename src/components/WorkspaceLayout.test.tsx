import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceLayout } from "./WorkspaceLayout";

describe("WorkspaceLayout", () => {
  it("mounts the three workspace regions", () => {
    render(<WorkspaceLayout />);
    expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
    expect(screen.getByTestId("object-panel")).toBeInTheDocument();
    expect(screen.getByTestId("command-bar")).toBeInTheDocument();
  });

  it("labels the preview, scene, and command regions", () => {
    render(<WorkspaceLayout />);
    expect(
      screen.getByRole("region", { name: /3d preview/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /scene objects/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /ai command/i }),
    ).toBeInTheDocument();
  });
});
