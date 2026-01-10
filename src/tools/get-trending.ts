import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers/response.js";
import { extractYear, truncateText } from "./helpers/formatters.js";
import { capTotalPages } from "./helpers/constants.js";

export const registerGetTrendingTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_trending",
    {
      title: "Get Trending",
      description:
        "Get trending movies and TV shows. Great for discovering what's popular right now.",
      inputSchema: {
        mediaType: z
          .enum(["movie", "tv", "all"])
          .optional()
          .describe(
            "Type of content: 'movie', 'tv', or 'all' (default: 'all')"
          ),
        timeWindow: z
          .enum(["day", "week"])
          .optional()
          .describe("Time window: 'day' or 'week' (default: 'week')"),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ mediaType = "all", timeWindow = "week", page }) => {
      try {
        const result = await tmdbClient.getTrending(mediaType, timeWindow, {
          page,
        });

        const formattedResults = result.results.map((item) => {
          const isMovie = item.media_type === "movie";
          const title = isMovie ? item.title : item.name;
          const releaseDate = isMovie ? item.release_date : item.first_air_date;

          return {
            tmdbId: item.id,
            mediaType: item.media_type,
            title: title || "Unknown",
            year: extractYear(releaseDate),
            releaseDate: releaseDate || "N/A",
            overview: truncateText(item.overview || "", 200),
            tmdbRating: item.vote_average,
            voteCount: item.vote_count,
            posterUrl: tmdbClient.getImageUrl(item.poster_path, "w342"),
          };
        });

        return createSuccessResponse({
          results: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: capTotalPages(result.total_pages),
          filters: {
            mediaType,
            timeWindow,
          },
        });
      } catch (error) {
        return createErrorResponse("getting trending", error);
      }
    }
  );
};
