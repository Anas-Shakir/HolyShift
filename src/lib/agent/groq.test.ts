import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizePatch, requestPatch } from "./groq";
import { ScenePatchSchema } from "./patch";
import { createEmptyScene } from "@/lib/scene/factory";

describe("normalizePatch", () => {
  it("drops nulls and narrows a create operation", () => {
    const raw = {
      operations: [
        {
          op: "create",
          object: {
            type: "cube",
            name: "Box",
            position: [1, 0, 0],
            rotation: null,
            scale: null,
            dimensions: null,
            material: { color: "#ff0000", metalness: null, roughness: null, opacity: null, emissiveIntensity: null },
          },
          target: null,
          changes: null,
          light: null,
          id: null,
        },
      ],
      clarification: null,
    };
    const normalized = normalizePatch(raw);
    const result = ScenePatchSchema.safeParse(normalized);
    expect(result.success).toBe(true);
    if (result.success) {
      const op = result.data.operations[0];
      expect(op.op).toBe("create");
      if (op.op === "create") {
        expect(op.object.material).toEqual({ color: "#ff0000" });
        expect(op.object.name).toBe("Box");
      }
    }
  });

  it("narrows an update target by type+ordinal and drops null ordinal", () => {
    const rawWithOrdinal = normalizePatch({
      operations: [
        {
          op: "update",
          object: null,
          target: { id: null, type: "monitor", ordinal: 2 },
          changes: { name: null, position: [2, 0, 0], rotation: null, scale: null, dimensions: null, material: null },
          light: null,
          id: null,
        },
      ],
      clarification: null,
    });
    expect(ScenePatchSchema.safeParse(rawWithOrdinal).success).toBe(true);

    const rawIdOnly = normalizePatch({
      operations: [
        {
          op: "delete",
          object: null,
          target: { id: "cube_01", type: null, ordinal: null },
          changes: null,
          light: null,
          id: null,
        },
      ],
      clarification: null,
    });
    const parsed = ScenePatchSchema.parse(rawIdOnly);
    expect(parsed.operations[0]).toEqual({ op: "delete", target: { id: "cube_01" } });
  });

  it("keeps a clarification when present", () => {
    const out = normalizePatch({ operations: [], clarification: "Which one?" });
    expect(ScenePatchSchema.parse(out).clarification).toBe("Which one?");
  });
});

describe("requestPatch (mocked fetch)", () => {
  afterEach(() => vi.restoreAllMocks());

  function mockGroqOnce(content: unknown) {
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    } as Response;
  }

  it("returns a validated patch from a good response", async () => {
    const good = {
      operations: [
        { op: "create", object: { type: "desk", name: null, position: null, rotation: null, scale: null, dimensions: null, material: null }, target: null, changes: null, light: null, id: null },
      ],
      clarification: null,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockGroqOnce(good));

    const patch = await requestPatch(createEmptyScene(), "add a desk", { apiKey: "test-key" });
    expect(patch.operations[0].op).toBe("create");
  });

  it("retries once with a repair note when the first output is invalid", async () => {
    const bad = { operations: [{ op: "create", object: { type: "dragon" }, target: null, changes: null, light: null, id: null }], clarification: null };
    const good = { operations: [{ op: "create", object: { type: "chair", name: null, position: null, rotation: null, scale: null, dimensions: null, material: null }, target: null, changes: null, light: null, id: null }], clarification: null };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockGroqOnce(bad))
      .mockResolvedValueOnce(mockGroqOnce(good));

    const patch = await requestPatch(createEmptyScene(), "add a chair", { apiKey: "test-key" });
    expect(patch.operations[0].op).toBe("create");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws when no API key is available", async () => {
    await expect(requestPatch(createEmptyScene(), "hi", { apiKey: "" })).rejects.toThrow(/not configured/i);
  });

  it("throws on a non-ok Groq response after the repair retry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    } as Response);
    await expect(
      requestPatch(createEmptyScene(), "add a cube", { apiKey: "test-key" }),
    ).rejects.toThrow(/Groq request failed/i);
  });
});
