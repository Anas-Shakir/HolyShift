import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObjectPanel } from "./ObjectPanel";
import { JsonInspector } from "./JsonInspector";
import { useSceneStore } from "@/store/sceneStore";
import { createEmptyScene } from "@/lib/scene/factory";

beforeEach(() => {
  useSceneStore.setState({ scene: createEmptyScene(), status: "idle", error: null });
});

describe("ObjectPanel", () => {
  it("shows an empty state initially", () => {
    render(<ObjectPanel />);
    expect(screen.getByText(/no objects yet/i)).toBeInTheDocument();
  });

  it("reflects store changes when an object is added", async () => {
    const user = userEvent.setup();
    render(<ObjectPanel />);
    await user.click(screen.getByRole("button", { name: "desk" }));
    expect(screen.getByTestId("object-item-desk_01")).toBeInTheDocument();
  });

  it("removes an object via its remove button", async () => {
    const user = userEvent.setup();
    useSceneStore.getState().addObject("chair");
    render(<ObjectPanel />);
    expect(screen.getByTestId("object-item-chair_01")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove chair/i }));
    expect(screen.queryByTestId("object-item-chair_01")).not.toBeInTheDocument();
  });
});

describe("JsonInspector", () => {
  it("updates the object panel when raw state is edited and applied", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ObjectPanel />
        <JsonInspector />
      </>,
    );

    // Build a scene with one cube and inject via the inspector.
    const scene = createEmptyScene();
    scene.objects.push({
      id: "cube_01",
      type: "cube",
      name: "Injected Cube",
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      dimensions: [1, 1, 1],
      material: { color: "#ffffff", metalness: 0, roughness: 0.5, opacity: 1, emissiveIntensity: 0 },
    });

    const textarea = screen.getByTestId("json-inspector-textarea");
    await user.clear(textarea);
    await user.paste(JSON.stringify(scene));
    await user.click(screen.getByRole("button", { name: /apply/i }));

    const item = screen.getByTestId("object-item-cube_01");
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent(/injected cube/i);
  });

  it("shows an error for invalid JSON and does not crash", async () => {
    const user = userEvent.setup();
    render(<JsonInspector />);
    const textarea = screen.getByTestId("json-inspector-textarea");
    await user.clear(textarea);
    await user.paste("{ not valid json");
    await user.click(screen.getByRole("button", { name: /apply/i }));
    expect(screen.getByTestId("json-inspector-error")).toBeInTheDocument();
  });
});
