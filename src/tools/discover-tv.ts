import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  truncateText,
  extractYear,
  TV_GENRE_MAP,
  getGenreId,
} from "./helpers.js";

export const registerDiscoverTvTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "discover_tv",
    {
      title: "Discover TV Shows",
      description:
        "Discover TV shows using advanced filters like genre, year, rating, network, and language. Great for finding TV series that match specific criteria.",
      inputSchema: {
        year: z
          .number()
          .optional()
          .describe("Filter by first air date year (e.g., 2023)"),
        genre: z
          .string()
          .optional()
          .describe(
            "Genre name (e.g., 'drama', 'comedy', 'sci-fi', 'crime', 'documentary')"
          ),
        minRating: z
          .number()
          .min(0)
          .max(10)
          .optional()
          .describe("Minimum TMDB rating (0-10)"),
        language: z
          .string()
          .optional()
          .describe(
            "Original language code (e.g., 'en', 'ko', 'ja', 'es')"
          ),
        sortBy: z
          .enum([
            "popularity.desc",
            "popularity.asc",
            "first_air_date.desc",
            "first_air_date.asc",
            "vote_average.desc",
            "vote_average.asc",
          ])
          .optional()
          .describe("Sort order (default: popularity.desc)"),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({
      year,
      genre,
      minRating,
      language,
      sortBy,
      page,
    }) => {
      try {
        let genreId: string | undefined;
        if (genre) {
          const mappedId = getGenreId(genre, TV_GENRE_MAP);
          if (mappedId) {
            genreId = mappedId.toString();
          } else {
            return createErrorResponse(
              "discovering TV shows",
              new Error(
                `Unknown genre '${genre}'. Available genres: ${Object.keys(TV_GENRE_MAP).join(", ")}`
              )
            );
          }
        }

        const result = await tmdbClient.discoverTv({
          page,
          sort_by: sortBy,
          first_air_date_year: year,
          with_genres: genreId,
          vote_average_gte: minRating,
          vote_count_gte: minRating ? 50 : undefined,
          with_original_language: language,
        });

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
          filters: {
            year,
            genre,
            minRating,
            language,
            sortBy: sortBy || "popularity.desc",
          },
        });
      } catch (error) {
        return createErrorResponse("discovering TV shows", error);
      }
    }
  );
};
