import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransformFields } from "./TransformFields";
import { useSceneStore } from "@/store/sceneStore";
import { createEmptyScene } from "@/lib/scene/factory";
import { byId } from "@/lib/scene/resolve";

beforeEach(() => {
  useSceneStore.setState({ scene: createEmptyScene(), status: "idle", error: null, selectedId: null });
});

describe("TransformFields", () => {
  it("renders nothing when no object is selected", () => {
    const { container } = render(<TransformFields />);
    expect(container.firstChild).toBeNull();
  });

  it("renders inputs for the selected object", () => {
    useSceneStore.getState().addObject("cube");
    useSceneStore.getState().select("cube_01");
    render(<TransformFields />);
    expect(screen.getByTestId("transform-fields")).toBeInTheDocument();
    expect(screen.getByLabelText("Pos x")).toBeInTheDocument();
    expect(screen.getByLabelText("Rot° y")).toBeInTheDocument();
    expect(screen.getByLabelText("Scale z")).toBeInTheDocument();
  });

  it("editing a position input updates the object via updateObject", async () => {
    const user = userEvent.setup();
    useSceneStore.getState().addObject("cube");
    useSceneStore.getState().select("cube_01");
    render(<TransformFields />);

    const posX = screen.getByLabelText("Pos x");
    await user.clear(posX);
    await user.type(posX, "2.5");

    expect(byId(useSceneStore.getState().scene, "cube_01")!.transform.position[0]).toBeCloseTo(2.5);
  });

  it("editing rotation in degrees writes radians to the store", async () => {
    const user = userEvent.setup();
    useSceneStore.getState().addObject("cube");
    useSceneStore.getState().select("cube_01");
    render(<TransformFields />);

    const rotY = screen.getByLabelText("Rot° y");
    await user.clear(rotY);
    await user.type(rotY, "90");

    const rad = byId(useSceneStore.getState().scene, "cube_01")!.transform.rotation[1];
    expect(rad).toBeCloseTo(Math.PI / 2, 2);
  });
});
