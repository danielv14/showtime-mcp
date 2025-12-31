import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";

export const registerGetMovieTool = (
  server: McpServer,
  omdbClient: OmdbClient
) => {
  server.registerTool(
    "get_movie",
    {
      title: "Get Movie Details",
      description:
        "Get detailed information about a specific movie by IMDb ID or title. Returns full details including plot, ratings, cast, and more.",
      inputSchema: {
        imdbId: z
          .string()
          .optional()
          .describe("IMDb ID of the movie (e.g., 'tt0111161')"),
        title: z
          .string()
          .optional()
          .describe("Exact title of the movie to look up"),
        year: z
          .string()
          .optional()
          .describe("Year of release (helps disambiguate titles)"),
        plot: z
          .enum(["short", "full"])
          .optional()
          .describe("Plot length: 'short' (default) or 'full'"),
      },
    },
    async ({ imdbId, title, year, plot }) => {
      try {
        if (!imdbId && !title) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Either 'imdbId' or 'title' must be provided",
              },
            ],
            isError: true,
          };
        }

        let result;
        if (imdbId) {
          result = await omdbClient.getById({ imdbId, plot });
        } else {
          result = await omdbClient.getByTitle({
            title: title!,
            type: "movie",
            year,
            plot,
          });
        }

        if (result.Type !== "movie") {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: The result is a ${result.Type}, not a movie. Use the appropriate tool for ${result.Type}.`,
              },
            ],
            isError: true,
          };
        }

        const output = {
          title: result.Title,
          year: result.Year,
          rated: result.Rated,
          released: result.Released,
          runtime: result.Runtime,
          genre: result.Genre,
          director: result.Director,
          writer: result.Writer,
          actors: result.Actors,
          plot: result.Plot,
          language: result.Language,
          country: result.Country,
          awards: result.Awards,
          ratings: result.Ratings,
          metascore: result.Metascore,
          imdbRating: result.imdbRating,
          imdbVotes: result.imdbVotes,
          imdbId: result.imdbID,
          boxOffice: result.BoxOffice,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting movie details: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};
