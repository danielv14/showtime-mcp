import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers/response.js";
import { formatTmdbTvResult } from "./helpers/formatters.js";
import { capTotalPages } from "./helpers/constants.js";

export const registerGetAiringTodayTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_airing_today",
    {
      title: "Get TV Airing Today",
      description:
        "Get TV shows that have episodes airing today. Great for finding what's new on TV.",
      inputSchema: {
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ page }) => {
      try {
        const result = await tmdbClient.getAiringTodayTv({ page });

        const formattedResults = result.results.map((show) =>
          formatTmdbTvResult(show, tmdbClient.getImageUrl, {
            includeVoteCount: true,
          })
        );

        return createSuccessResponse({
          results: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: capTotalPages(result.total_pages),
        });
      } catch (error) {
        return createErrorResponse("getting TV shows airing today", error);
      }
    }
  );
};
