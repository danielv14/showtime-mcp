import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  formatOmdbEpisode,
} from "./helpers.js";

export const registerGetAllEpisodesTool = (
  server: McpServer,
  omdbClient: OmdbClient
) => {
  server.registerTool(
    "get_all_episodes",
    {
      title: "Get All Episodes",
      description:
        "Get all episodes across all seasons of a TV series. Returns episode titles, ratings, and air dates for the entire series. Useful for analyzing rating trends over time.",
      inputSchema: {
        seriesId: z
          .string()
          .describe("IMDb ID of the TV series (e.g., 'tt0411008' for Lost)"),
      },
    },
    async ({ seriesId }) => {
      try {
        const seasons = await omdbClient.getAllEpisodes({
          seriesId,
        });

        return createSuccessResponse({
          title: seasons[0]?.Title || "Unknown",
          totalSeasons: seasons.length,
          seasons: seasons.map((season) => ({
            season: season.Season,
            episodeCount: season.Episodes.length,
            episodes: season.Episodes.map(formatOmdbEpisode),
          })),
        });
      } catch (error) {
        return createErrorResponse("getting all episodes", error);
      }
    }
  );
};
