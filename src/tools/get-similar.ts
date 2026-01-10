import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  formatTmdbMovieResult,
  formatTmdbTvResult,
  requireAtLeastOne,
  capTotalPages,
} from "./helpers.js";

export const registerGetSimilarTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_similar",
    {
      title: "Get Similar",
      description:
        "Get similar movies or TV shows based on genres and keywords. Different from recommendations - this uses genre/keyword matching rather than TMDB's recommendation algorithm.",
      inputSchema: {
        movieId: z
          .number()
          .optional()
          .describe("TMDB movie ID (use search_movies to find IDs)"),
        tvId: z
          .number()
          .optional()
          .describe("TMDB TV series ID (use search_series to find IDs)"),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ movieId, tvId, page }) => {
      const validationError = requireAtLeastOne("getting similar content", {
        movieId,
        tvId,
      });
      if (validationError) return validationError;

      try {
        if (movieId) {
          const [similarResult, movieDetails] = await Promise.all([
            tmdbClient.getSimilarMovies(movieId, { page }),
            tmdbClient.getMovieDetails(movieId),
          ]);

          const formattedResults = similarResult.results.map((movie) =>
            formatTmdbMovieResult(movie, tmdbClient.getImageUrl, {
              includeVoteCount: true,
            })
          );

          return createSuccessResponse({
            mediaType: "movie",
            basedOn: {
              tmdbId: movieDetails.id,
              title: movieDetails.title,
              genres: movieDetails.genres.map((g) => g.name),
            },
            similar: formattedResults,
            totalResults: similarResult.total_results,
            page: similarResult.page,
            totalPages: capTotalPages(similarResult.total_pages),
          });
        }

        // TV show
        const [similarResult, tvDetails] = await Promise.all([
          tmdbClient.getSimilarTv(tvId!, { page }),
          tmdbClient.getTvDetails(tvId!),
        ]);

        const formattedResults = similarResult.results.map((show) =>
          formatTmdbTvResult(show, tmdbClient.getImageUrl, {
            includeVoteCount: true,
          })
        );

        return createSuccessResponse({
          mediaType: "tv",
          basedOn: {
            tmdbId: tvDetails.id,
            name: tvDetails.name,
            genres: tvDetails.genres.map((g) => g.name),
          },
          similar: formattedResults,
          totalResults: similarResult.total_results,
          page: similarResult.page,
          totalPages: capTotalPages(similarResult.total_pages),
        });
      } catch (error) {
        return createErrorResponse("getting similar content", error);
      }
    }
  );
};
