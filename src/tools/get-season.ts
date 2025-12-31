import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";

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

        const output = {
          title: result.Title,
          season: result.Season,
          totalSeasons: result.totalSeasons,
          episodes: result.Episodes.map((episode) => ({
            title: episode.Title,
            episode: episode.Episode,
            released: episode.Released,
            imdbRating: episode.imdbRating,
            imdbId: episode.imdbID,
          })),
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
              text: `Error getting season: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};
