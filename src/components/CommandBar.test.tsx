import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandBar } from "./CommandBar";
import { BlenderSyncProvider } from "./BlenderSyncProvider";
import { useSceneStore } from "@/store/sceneStore";
import { createEmptyScene } from "@/lib/scene/factory";
import { byType } from "@/lib/scene/resolve";

function renderBar() {
  return render(
    <BlenderSyncProvider>
      <CommandBar />
    </BlenderSyncProvider>,
  );
}

beforeEach(() => {
  useSceneStore.setState({ scene: createEmptyScene(), status: "idle", error: null });
});
afterEach(() => vi.restoreAllMocks());

function mockAgentResponse(body: unknown, ok = true, status = 200) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);
}

describe("CommandBar", () => {
  it("sends a prompt and applies the returned patch to the store", async () => {
    const user = userEvent.setup();
    mockAgentResponse({ patch: { operations: [{ op: "create", object: { type: "desk" } }] } });

    renderBar();
    await user.type(screen.getByLabelText(/describe or modify/i), "add a desk");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(byType(useSceneStore.getState().scene, "desk")).toHaveLength(1);
    });
    expect(screen.getByTestId("command-notice")).toBeInTheDocument();
  });

  it("shows an error when the API returns an error", async () => {
    const user = userEvent.setup();
    mockAgentResponse({ error: "AI is not configured." }, false, 503);

    renderBar();
    await user.type(screen.getByLabelText(/describe or modify/i), "add a desk");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByTestId("command-error")).toHaveTextContent(/not configured/i);
    });
  });

  it("shows a clarification and makes no changes", async () => {
    const user = userEvent.setup();
    useSceneStore.getState().addObject("monitor");
    useSceneStore.getState().addObject("monitor");
    mockAgentResponse({ patch: { operations: [], clarification: "Which monitor?" } });

    renderBar();
    await user.type(screen.getByLabelText(/describe or modify/i), "move it");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByTestId("command-notice")).toHaveTextContent(/which monitor/i);
    });
    expect(byType(useSceneStore.getState().scene, "monitor")).toHaveLength(2);
  });
});

