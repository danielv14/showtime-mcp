import { z } from "zod";
import { defineTool, failWith } from "./define-tool.js";
import { formatReview } from "./helpers/formatters.js";
import { requireAtLeastOne } from "./helpers/resolvers.js";

export const getReviewsTool = defineTool({
  name: "get_reviews",
  title: "Get Reviews",
  description:
    "Get user reviews for movies or TV shows from the TMDB community.",
  schema: {
    movieId: z
      .number()
      .optional()
      .describe("TMDB movie ID (use search_movies to find IDs)"),
    tvId: z
      .number()
      .optional()
      .describe("TMDB TV series ID (use search_series to find IDs)"),
    page: z.number().min(1).optional().describe("Page number for pagination"),
  },
  handler: async ({ movieId, tvId, page }, { tmdb }) => {
    const guardError = requireAtLeastOne("getting reviews", { movieId, tvId });
    if (guardError) return failWith(guardError);

    let mediaTitle = "";
    let mediaType: "movie" | "tv" = "movie";
    let reviewsResponse;

    if (movieId) {
      const [reviews, movieDetails] = await Promise.all([
        tmdb.getMovieReviews(movieId, { page }),
        tmdb.getMovieDetails(movieId),
      ]);
      reviewsResponse = reviews;
      mediaTitle = movieDetails.title;
      mediaType = "movie";
    } else if (tvId) {
      const [reviews, tvDetails] = await Promise.all([
        tmdb.getTvReviews(tvId, { page }),
        tmdb.getTvDetails(tvId),
      ]);
      reviewsResponse = reviews;
      mediaTitle = tvDetails.name;
      mediaType = "tv";
    }

    const formattedReviews = reviewsResponse!.results.map(formatReview);

    return {
      mediaType,
      mediaTitle,
      mediaId: movieId || tvId,
      reviews: formattedReviews,
      totalReviews: reviewsResponse!.total_results,
      page: reviewsResponse!.page,
      totalPages: reviewsResponse!.total_pages,
    };
  },
});
