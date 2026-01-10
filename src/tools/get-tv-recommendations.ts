import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers/response.js";
import { formatTmdbTvResult } from "./helpers/formatters.js";
import { capTotalPages } from "./helpers/constants.js";
import { requireAtLeastOne, resolveTvId } from "./helpers/resolvers.js";

export const registerGetTvRecommendationsTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_tv_recommendations",
    {
      title: "Get TV Recommendations",
      description:
        "Get TV series recommendations based on a specific show. Great for finding similar shows you might enjoy.",
      inputSchema: {
        tmdbId: z
          .number()
          .optional()
          .describe("TMDB TV series ID"),
        title: z
          .string()
          .optional()
          .describe("TV series title to get recommendations for"),
        page: z
          .number()
          .min(1)
          .optional()
          .describe("Page number for pagination (20 results per page)"),
      },
    },
    async ({ tmdbId, title, page }) => {
      try {
        const validationError = requireAtLeastOne(
          "getting TV recommendations",
          { tmdbId, title }
        );
        if (validationError) return validationError;

        const resolved = await resolveTvId(
          tmdbClient,
          "getting TV recommendations",
          { tmdbId, title }
        );
        if (!resolved.success) return resolved.error;

        const { id: tvId, name: sourceShowTitle } = resolved.tv;

        const result = await tmdbClient.getTvRecommendations(tvId, { page });

        const formattedResults = result.results.map((show) =>
          formatTmdbTvResult(show, tmdbClient.getImageUrl, {
            includeVoteCount: true,
          })
        );

        return createSuccessResponse({
          sourceShow: {
            tmdbId: tvId,
            title: sourceShowTitle,
          },
          recommendations: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: capTotalPages(result.total_pages),
        });
      } catch (error) {
        return createErrorResponse("getting TV recommendations", error);
      }
    }
  );
};
