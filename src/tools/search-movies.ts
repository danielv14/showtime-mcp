import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  formatTmdbMovieResult,
} from "./helpers.js";

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

        const formattedResults = result.results.map((movie) =>
          formatTmdbMovieResult(movie, tmdbClient.getImageUrl)
        );

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
