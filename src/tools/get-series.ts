import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient, OmdbSeriesDetails } from "../omdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  requireAtLeastOne,
} from "./helpers.js";

export const registerGetSeriesTool = (
  server: McpServer,
  omdbClient: OmdbClient
) => {
  server.registerTool(
    "get_series",
    {
      title: "Get TV Series Details",
      description:
        "Get detailed information about a specific TV series by IMDb ID or title. Returns full details including plot, ratings, cast, total seasons, and more.",
      inputSchema: {
        imdbId: z
          .string()
          .optional()
          .describe("IMDb ID of the series (e.g., 'tt0903747')"),
        title: z
          .string()
          .optional()
          .describe("Exact title of the series to look up"),
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
        const validationError = requireAtLeastOne("getting series details", {
          imdbId,
          title,
        });
        if (validationError) return validationError;

        let result;
        if (imdbId) {
          result = await omdbClient.getById({ imdbId, plot });
        } else {
          result = await omdbClient.getByTitle({
            title: title!,
            type: "series",
            year,
            plot,
          });
        }

        if (result.Type !== "series") {
          return createErrorResponse("getting series details", new Error(`The result is a ${result.Type}, not a series. Use the appropriate tool for ${result.Type}.`));
        }

        const seriesResult = result as OmdbSeriesDetails;

        return createSuccessResponse({
          title: seriesResult.Title,
          year: seriesResult.Year,
          rated: seriesResult.Rated,
          released: seriesResult.Released,
          runtime: seriesResult.Runtime,
          genre: seriesResult.Genre,
          director: seriesResult.Director,
          writer: seriesResult.Writer,
          actors: seriesResult.Actors,
          plot: seriesResult.Plot,
          language: seriesResult.Language,
          country: seriesResult.Country,
          awards: seriesResult.Awards,
          ratings: seriesResult.Ratings,
          metascore: seriesResult.Metascore,
          imdbRating: seriesResult.imdbRating,
          imdbVotes: seriesResult.imdbVotes,
          imdbId: seriesResult.imdbID,
          totalSeasons: seriesResult.totalSeasons,
        });
      } catch (error) {
        return createErrorResponse("getting series details", error);
      }
    }
  );
};
