import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient, TmdbReview } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  requireAtLeastOne,
  truncateText,
} from "./helpers.js";

const formatReview = (review: TmdbReview) => ({
  id: review.id,
  author: review.author,
  username: review.author_details.username,
  rating: review.author_details.rating,
  content: truncateText(review.content, 1000),
  createdAt: review.created_at,
  url: review.url,
});

export const registerGetReviewsTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_reviews",
    {
      title: "Get Reviews",
      description:
        "Get user reviews for movies or TV shows from the TMDB community.",
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
          .describe("Page number for pagination"),
      },
    },
    async ({ movieId, tvId, page }) => {
      const validationError = requireAtLeastOne("getting reviews", {
        movieId,
        tvId,
      });
      if (validationError) return validationError;

      try {
        let mediaTitle: string = "";
        let mediaType: "movie" | "tv" = "movie";
        let reviewsResponse;

        if (movieId) {
          const [reviews, movieDetails] = await Promise.all([
            tmdbClient.getMovieReviews(movieId, { page }),
            tmdbClient.getMovieDetails(movieId),
          ]);
          reviewsResponse = reviews;
          mediaTitle = movieDetails.title;
          mediaType = "movie";
        } else if (tvId) {
          const [reviews, tvDetails] = await Promise.all([
            tmdbClient.getTvReviews(tvId, { page }),
            tmdbClient.getTvDetails(tvId),
          ]);
          reviewsResponse = reviews;
          mediaTitle = tvDetails.name;
          mediaType = "tv";
        }

        const formattedReviews = reviewsResponse!.results.map(formatReview);

        return createSuccessResponse({
          mediaType,
          mediaTitle,
          mediaId: movieId || tvId,
          reviews: formattedReviews,
          totalReviews: reviewsResponse!.total_results,
          page: reviewsResponse!.page,
          totalPages: reviewsResponse!.total_pages,
        });
      } catch (error) {
        return createErrorResponse("getting reviews", error);
      }
    }
  );
};
