import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerifyPanel } from "./VerifyPanel";
import { useSceneStore } from "@/store/sceneStore";
import { createEmptyScene } from "@/lib/scene/factory";

beforeEach(() => {
  useSceneStore.setState({
    scene: createEmptyScene(),
    status: "idle",
    error: null,
    selectedId: null,
    issues: [],
    verified: false,
  });
});

function addFloatingCube() {
  useSceneStore.getState().addObject("cube");
  const id = useSceneStore.getState().scene.objects[0].id;
  useSceneStore.getState().updateObject(id, { transform: { position: [0, 5, 0] } });
  return id;
}

describe("VerifyPanel", () => {
  it("shows a clean state when verification finds no issues", async () => {
    const user = userEvent.setup();
    useSceneStore.getState().addObject("cube");
    // rest it on the floor (center y = half height) so nothing is flagged
    useSceneStore.getState().updateObject(useSceneStore.getState().scene.objects[0].id, {
      transform: { position: [0, 0.5, 0] },
    });
    render(<VerifyPanel />);
    await user.click(screen.getByRole("button", { name: /verify scene/i }));
    expect(screen.getByTestId("verify-clean")).toBeInTheDocument();
  });

  it("lists a floating issue and fixes it on click", async () => {
    const user = userEvent.setup();
    const id = addFloatingCube();
    render(<VerifyPanel />);

    await user.click(screen.getByRole("button", { name: /verify scene/i }));
    expect(screen.getByTestId("verify-issues")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `Fix floating:${id}` }));
    // after fixing, the floating issue is gone
    expect(useSceneStore.getState().issues.find((i) => i.kind === "floating")).toBeFalsy();
  });

  it("Fix all resolves fixable issues", async () => {
    const user = userEvent.setup();
    addFloatingCube();
    render(<VerifyPanel />);
    await user.click(screen.getByRole("button", { name: /verify scene/i }));
    await user.click(screen.getByRole("button", { name: /fix all/i }));
    expect(useSceneStore.getState().issues.find((i) => i.kind === "floating")).toBeFalsy();
  });

  it("clicking an issue selects its target object", async () => {
    const user = userEvent.setup();
    const id = addFloatingCube();
    render(<VerifyPanel />);
    await user.click(screen.getByRole("button", { name: /verify scene/i }));
    await user.click(screen.getByTestId(`issue-floating:${id}`));
    expect(useSceneStore.getState().selectedId).toBe(id);
  });
});
