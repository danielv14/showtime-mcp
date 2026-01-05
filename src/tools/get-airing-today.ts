import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  truncateText,
  extractYear,
} from "./helpers.js";

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

        const formattedResults = result.results.map((show) => ({
          tmdbId: show.id,
          name: show.name,
          year: extractYear(show.first_air_date),
          firstAirDate: show.first_air_date || "N/A",
          overview: truncateText(show.overview || "", 200),
          tmdbRating: show.vote_average,
          voteCount: show.vote_count,
          posterUrl: tmdbClient.getImageUrl(show.poster_path, "w342"),
        }));

        return createSuccessResponse({
          results: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: Math.min(result.total_pages, 500),
        });
      } catch (error) {
        return createErrorResponse("getting TV shows airing today", error);
      }
    }
  );
};
