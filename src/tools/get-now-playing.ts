import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers/response.js";
import { formatTmdbMovieResult } from "./helpers/formatters.js";
import { capTotalPages } from "./helpers/constants.js";

export const registerGetNowPlayingTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_now_playing",
    {
      title: "Get Now Playing Movies",
      description:
        "Get movies currently playing in theaters. Results are region-specific.",
      inputSchema: {
        region: z
          .string()
          .optional()
          .describe(
            "ISO 3166-1 country code for regional results (e.g., 'US', 'GB', 'SE'). Defaults to US."
          ),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ region = "US", page }) => {
      try {
        const result = await tmdbClient.getNowPlayingMovies({ page, region });

        const formattedResults = result.results.map((movie) =>
          formatTmdbMovieResult(movie, tmdbClient.getImageUrl, {
            includeVoteCount: true,
          })
        );

        return createSuccessResponse({
          results: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: capTotalPages(result.total_pages),
          region,
        });
      } catch (error) {
        return createErrorResponse("getting now playing movies", error);
      }
    }
  );
};
