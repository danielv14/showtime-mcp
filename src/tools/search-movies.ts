import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers.js";

export const registerSearchMoviesTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "search_movies",
    {
      title: "Search Movies",
      description:
        "Search for movies by title using TMDB's advanced search. Returns a list of matching movies with basic info including TMDB ID, title, year, overview, and poster.",
      inputSchema: {
        query: z.string().describe("Movie title to search for"),
        year: z
          .number()
          .optional()
          .describe("Filter results by release year (e.g., 2023)"),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ query, year, page }) => {
      try {
        const result = await tmdbClient.searchMovies(query, { page, year });

        const formattedResults = result.results.map((movie) => ({
          tmdbId: movie.id,
          title: movie.title,
          year: movie.release_date?.split("-")[0] || "N/A",
          releaseDate: movie.release_date || "N/A",
          overview:
            movie.overview.length > 200
              ? movie.overview.substring(0, 200) + "..."
              : movie.overview,
          tmdbRating: movie.vote_average,
          posterUrl: tmdbClient.getImageUrl(movie.poster_path, "w342"),
        }));

        return createSuccessResponse({
          results: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: result.total_pages,
        });
      } catch (error) {
        return createErrorResponse("searching movies", error);
      }
    }
  );
};
