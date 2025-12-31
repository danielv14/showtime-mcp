import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";

export const registerSearchSeriesTool = (
  server: McpServer,
  omdbClient: OmdbClient
) => {
  server.registerTool(
    "search_series",
    {
      title: "Search TV Series",
      description:
        "Search for TV series by title. Returns a list of matching series with basic info (title, year, IMDb ID).",
      inputSchema: {
        query: z.string().describe("TV series title to search for"),
        year: z
          .string()
          .optional()
          .describe("Filter results by release year (e.g., '2023')"),
        page: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Page number for pagination (1-100, 10 results per page)"),
      },
    },
    async ({ query, year, page }) => {
      try {
        const result = await omdbClient.searchSeries({ query, year, page });

        const formattedResults = result.Search.map((series) => ({
          title: series.Title,
          year: series.Year,
          imdbId: series.imdbID,
          type: series.Type,
        }));

        const output = {
          results: formattedResults,
          totalResults: parseInt(result.totalResults, 10),
          page: page || 1,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching series: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};
