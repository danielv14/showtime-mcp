import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers.js";

export const registerSearchPersonTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "search_person",
    {
      title: "Search Person",
      description:
        "Search for actors, directors, and other crew members by name. Returns a list of matching people with their TMDB ID (needed for filmography lookup), known department, and notable works.",
      inputSchema: {
        query: z.string().describe("Person name to search for"),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ query, page }) => {
      try {
        const result = await tmdbClient.searchPerson(query, { page });

        const formattedResults = result.results.map((person) => ({
          tmdbId: person.id,
          name: person.name,
          knownForDepartment: person.known_for_department,
          profileImageUrl: tmdbClient.getImageUrl(person.profile_path, "w185"),
          knownFor: person.known_for.slice(0, 3).map((movie) => ({
            title: movie.title,
            year: movie.release_date?.split("-")[0] || "N/A",
            tmdbId: movie.id,
          })),
        }));

        return createSuccessResponse({
          results: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: result.total_pages,
        });
      } catch (error) {
        return createErrorResponse("searching person", error);
      }
    }
  );
};
