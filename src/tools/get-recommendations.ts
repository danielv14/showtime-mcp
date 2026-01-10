import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers/response.js";
import { formatTmdbMovieResult } from "./helpers/formatters.js";
import { capTotalPages } from "./helpers/constants.js";
import { requireAtLeastOne, resolveMovieId } from "./helpers/resolvers.js";

export const registerGetRecommendationsTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_movie_recommendations",
    {
      title: "Get Movie Recommendations",
      description:
        "Get movie recommendations based on a specific movie. Great for finding similar movies you might enjoy. Uses TMDB's recommendation algorithm.",
      inputSchema: {
        tmdbId: z
          .number()
          .optional()
          .describe("TMDB movie ID (use search_movies to find IDs)"),
        title: z
          .string()
          .optional()
          .describe("Movie title to get recommendations for"),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ tmdbId, title, page }) => {
      try {
        const validationError = requireAtLeastOne(
          "getting movie recommendations",
          { tmdbId, title }
        );
        if (validationError) return validationError;

        const resolved = await resolveMovieId(
          tmdbClient,
          "getting movie recommendations",
          { tmdbId, title }
        );
        if (!resolved.success) return resolved.error;

        const { id: movieId, title: sourceMovieTitle } = resolved.movie;

        const result = await tmdbClient.getMovieRecommendations(movieId, {
          page,
        });

        const formattedResults = result.results.map((movie) =>
          formatTmdbMovieResult(movie, tmdbClient.getImageUrl, {
            includeVoteCount: true,
          })
        );

        return createSuccessResponse({
          sourceMovie: {
            tmdbId: movieId,
            title: sourceMovieTitle,
          },
          recommendations: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: capTotalPages(result.total_pages),
        });
      } catch (error) {
        return createErrorResponse("getting movie recommendations", error);
      }
    }
  );
};
