import { describe, it, expect } from "bun:test";
import { z } from "zod";
import {
  defineTool,
  paginatedResult,
  registerTool,
  type AnyToolDefinition,
  type ToolClients,
} from "../define-tool.js";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";

const clients: ToolClients = {
  tmdb: createFakeTmdbClient(),
  omdb: createFakeOmdbClient(),
};

/**
 * Minimal stand-in for McpServer.registerTool that captures the registered
 * handler so we can drive it the way the SDK would.
 */
const captureRegistration = (definition: AnyToolDefinition) => {
  let captured: ((args: unknown) => Promise<unknown>) | undefined;
  const fakeServer = {
    registerTool: (_name: string, _config: unknown, handler: typeof captured) => {
      captured = handler;
    },
  };
  registerTool(fakeServer as never, definition, clients);
  if (!captured) throw new Error("handler was not registered");
  return captured;
};

describe("registerTool", () => {
  it("wraps a returned payload in a success response", async () => {
    const tool = defineTool({
      name: "echo",
      title: "Echo",
      description: "returns its input",
      schema: { value: z.string() },
      handler: async ({ value }) => ({ value }),
    });

    const run = captureRegistration(tool);
    const response = (await run({ value: "hi" })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };

    expect(response.isError).toBeUndefined();
    expect(JSON.parse(response.content[0]!.text)).toEqual({ value: "hi" });
  });

  it("shapes a paginatedResult into a paginated response", async () => {
    const tool = defineTool({
      name: "list",
      title: "List",
      description: "paginated list",
      schema: { page: z.number() },
      handler: async () =>
        paginatedResult(
          { total_results: 3, page: 1, total_pages: 1 },
          { results: [{ id: 1 }] }
        ),
    });

    const run = captureRegistration(tool);
    const response = (await run({ page: 1 })) as {
      content: { text: string }[];
    };
    const payload = JSON.parse(response.content[0]!.text);

    expect(payload).toEqual({
      results: [{ id: 1 }],
      totalResults: 3,
      page: 1,
      totalPages: 1,
    });
  });

  it("turns a thrown error into an error response with the tool's context", async () => {
    const tool = defineTool({
      name: "boom",
      title: "Detonator",
      description: "always throws",
      schema: {},
      handler: async () => {
        throw new Error("kaboom");
      },
    });

    const run = captureRegistration(tool);
    const response = (await run({})) as {
      content: { text: string }[];
      isError?: boolean;
    };

    expect(response.isError).toBe(true);
    expect(response.content[0]!.text).toBe("Error detonator: kaboom");
  });

  it("coerces a handler that returns nothing into a 'null' success body", async () => {
    const tool = defineTool({
      name: "empty",
      title: "Empty",
      description: "returns nothing",
      schema: {},
      handler: async () => undefined,
    });

    const run = captureRegistration(tool);
    const response = (await run({})) as {
      content: { text: string }[];
      isError?: boolean;
    };

    expect(response.isError).toBeUndefined();
    expect(response.content[0]!.text).toBe("null");
  });
});
