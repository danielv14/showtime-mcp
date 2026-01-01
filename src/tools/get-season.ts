import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  formatOmdbEpisode,
} from "./helpers.js";

export const registerGetSeasonTool = (
  server: McpServer,
  omdbClient: OmdbClient
) => {
  server.registerTool(
    "get_season",
    {
      title: "Get Season Episodes",
      description:
        "Get all episodes in a specific season of a TV series. Returns episode titles, ratings, and air dates for the entire season in a single request.",
      inputSchema: {
        seriesId: z
          .string()
          .describe("IMDb ID of the TV series (e.g., 'tt0411008' for Lost)"),
        season: z.number().min(1).describe("Season number"),
      },
    },
    async ({ seriesId, season }) => {
      try {
        const result = await omdbClient.getSeason({
          seriesId,
          season,
        });

        return createSuccessResponse({
          title: result.Title,
          season: result.Season,
          totalSeasons: result.totalSeasons,
          episodes: result.Episodes.map(formatOmdbEpisode),
        });
      } catch (error) {
        return createErrorResponse("getting season", error);
      }
    }
  );
};
