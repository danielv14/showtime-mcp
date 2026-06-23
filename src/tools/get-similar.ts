import { z } from "zod";
import { defineTool, paginatedResult, failWith } from "./define-tool.js";
import { formatTmdbMovieResult, formatTmdbTvResult } from "./helpers/formatters.js";
import { requireAtLeastOne } from "./helpers/resolvers.js";

export const getSimilarTool = defineTool({
  name: "get_similar",
  title: "Get Similar",
  description:
    "Get similar movies or TV shows based on genres and keywords. Different from recommendations - this uses genre/keyword matching rather than TMDB's recommendation algorithm.",
  schema: {
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
  handler: async ({ movieId, tvId, page }, { tmdb }) => {
    const guardError = requireAtLeastOne("getting similar content", {
      movieId,
      tvId,
    });
    if (guardError) return failWith(guardError);

    if (movieId) {
      const [similarResult, movieDetails] = await Promise.all([
        tmdb.getSimilarMovies(movieId, { page }),
        tmdb.getMovieDetails(movieId),
      ]);

      const formattedResults = similarResult.results.map((movie) =>
        formatTmdbMovieResult(movie, tmdb.getImageUrl, { includeVoteCount: true })
      );

      return paginatedResult(similarResult, {
        mediaType: "movie",
        basedOn: {
          tmdbId: movieDetails.id,
          title: movieDetails.title,
          genres: movieDetails.genres.map((g) => g.name),
        },
        similar: formattedResults,
      });
    }

    // TV show
    const [similarResult, tvDetails] = await Promise.all([
      tmdb.getSimilarTv(tvId!, { page }),
      tmdb.getTvDetails(tvId!),
    ]);

    const formattedResults = similarResult.results.map((show) =>
      formatTmdbTvResult(show, tmdb.getImageUrl, { includeVoteCount: true })
    );

    return paginatedResult(similarResult, {
      mediaType: "tv",
      basedOn: {
        tmdbId: tvDetails.id,
        name: tvDetails.name,
        genres: tvDetails.genres.map((g) => g.name),
      },
      similar: formattedResults,
    });
  },
});
