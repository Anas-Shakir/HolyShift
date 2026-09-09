import { describe, it, expect, beforeEach } from "vitest";
import { useSceneStore } from "./sceneStore";
import { createEmptyScene } from "@/lib/scene/factory";

function reset() {
  useSceneStore.setState({ scene: createEmptyScene(), status: "idle", error: null });
}

describe("sceneStore", () => {
  beforeEach(reset);

  it("adds an object via action", () => {
    useSceneStore.getState().addObject("desk");
    expect(useSceneStore.getState().scene.objects).toHaveLength(1);
    expect(useSceneStore.getState().status).toBe("idle");
  });

  it("updates and removes an object", () => {
    useSceneStore.getState().addObject("cube");
    const id = useSceneStore.getState().scene.objects[0].id;

    useSceneStore.getState().updateObject(id, { name: "Box" });
    expect(useSceneStore.getState().scene.objects[0].name).toBe("Box");

    useSceneStore.getState().removeObject(id);
    expect(useSceneStore.getState().scene.objects).toHaveLength(0);
  });

  it("sets error status and preserves last-good scene on a bad op", () => {
    useSceneStore.getState().addObject("desk");
    const good = useSceneStore.getState().scene;

    useSceneStore.getState().updateObject("missing_99", { name: "x" });

    const state = useSceneStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBeTruthy();
    // scene unchanged
    expect(state.scene).toEqual(good);
  });

  it("clearError returns to idle", () => {
    useSceneStore.getState().removeObject("missing_99");
    expect(useSceneStore.getState().status).toBe("error");
    useSceneStore.getState().clearError();
    expect(useSceneStore.getState().status).toBe("idle");
    expect(useSceneStore.getState().error).toBeNull();
  });

  it("replaceScene rejects an invalid scene and keeps the current one", () => {
    useSceneStore.getState().addObject("chair");
    const good = useSceneStore.getState().scene;
    // @ts-expect-error deliberately invalid
    useSceneStore.getState().replaceScene({ nonsense: true });
    expect(useSceneStore.getState().status).toBe("error");
    expect(useSceneStore.getState().scene).toEqual(good);
  });

  it("applyAgentPatch applies a create op and reports it", () => {
    const result = useSceneStore.getState().applyAgentPatch({
      operations: [{ op: "create", object: { type: "desk" } }],
    });
    expect(result.errors).toHaveLength(0);
    expect(result.applied).toHaveLength(1);
    expect(useSceneStore.getState().scene.objects).toHaveLength(1);
  });

  it("applyAgentPatch surfaces per-op errors and sets error status", () => {
    const result = useSceneStore.getState().applyAgentPatch({
      operations: [{ op: "delete", target: { id: "ghost_99" } }],
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(useSceneStore.getState().status).toBe("error");
  });

  it("applyAgentPatch passes a clarification through without changes", () => {
    useSceneStore.getState().addObject("monitor");
    const before = useSceneStore.getState().scene;
    const result = useSceneStore.getState().applyAgentPatch({
      operations: [],
      clarification: "Which monitor?",
    });
    expect(result.clarification).toBe("Which monitor?");
    expect(useSceneStore.getState().scene).toEqual(before);
  });
});
