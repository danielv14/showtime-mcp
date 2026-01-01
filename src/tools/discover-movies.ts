import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  formatTmdbMovieResult,
  MOVIE_GENRE_MAP,
  getGenreId,
} from "./helpers.js";

export const registerDiscoverMoviesTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "discover_movies",
    {
      title: "Discover Movies",
      description:
        "Discover movies using advanced filters like genre, year, rating, director, actor, and language. Great for finding movies that match specific criteria.",
      inputSchema: {
        year: z
          .number()
          .optional()
          .describe("Filter by release year (e.g., 2023)"),
        genre: z
          .string()
          .optional()
          .describe(
            "Genre name (e.g., 'action', 'comedy', 'sci-fi', 'thriller', 'drama')"
          ),
        minRating: z
          .number()
          .min(0)
          .max(10)
          .optional()
          .describe("Minimum TMDB rating (0-10)"),
        directorId: z
          .number()
          .optional()
          .describe(
            "TMDB person ID for director (use search_person to find IDs)"
          ),
        actorId: z
          .number()
          .optional()
          .describe("TMDB person ID for actor (use search_person to find IDs)"),
        language: z
          .string()
          .optional()
          .describe(
            "Original language code (e.g., 'en', 'fr', 'ko', 'ja', 'es')"
          ),
        sortBy: z
          .enum([
            "popularity.desc",
            "popularity.asc",
            "release_date.desc",
            "release_date.asc",
            "vote_average.desc",
            "vote_average.asc",
            "revenue.desc",
            "revenue.asc",
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
      directorId,
      actorId,
      language,
      sortBy,
      page,
    }) => {
      try {
        let genreId: string | undefined;
        if (genre) {
          const mappedId = getGenreId(genre, MOVIE_GENRE_MAP);
          if (mappedId) {
            genreId = mappedId.toString();
          } else {
            return createErrorResponse(
              "discovering movies",
              new Error(
                `Unknown genre '${genre}'. Available genres: ${Object.keys(MOVIE_GENRE_MAP).join(", ")}`
              )
            );
          }
        }

        let withPeople: string | undefined;
        const peopleIds: number[] = [];
        if (directorId) peopleIds.push(directorId);
        if (actorId) peopleIds.push(actorId);
        if (peopleIds.length > 0) {
          withPeople = peopleIds.join(",");
        }

        const result = await tmdbClient.discoverMovies({
          page,
          sort_by: sortBy,
          primary_release_year: year,
          with_genres: genreId,
          with_people: withPeople,
          vote_average_gte: minRating,
          vote_count_gte: minRating ? 50 : undefined,
          with_original_language: language,
        });

        const formattedResults = result.results.map((movie) =>
          formatTmdbMovieResult(movie, tmdbClient.getImageUrl, {
            includeVoteCount: true,
          })
        );

        return createSuccessResponse({
          results: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: Math.min(result.total_pages, 500),
          filters: {
            year,
            genre,
            minRating,
            directorId,
            actorId,
            language,
            sortBy: sortBy || "popularity.desc",
          },
        });
      } catch (error) {
        return createErrorResponse("discovering movies", error);
      }
    }
  );
};
