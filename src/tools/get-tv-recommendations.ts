import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  extractYear,
  truncateText,
  requireAtLeastOne,
} from "./helpers.js";

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

        let tvId: number | undefined = tmdbId;
        let sourceShowTitle: string | undefined;

        if (!tvId && title) {
          const searchResult = await tmdbClient.searchTv(title);
          const firstResult = searchResult.results[0];
          if (!firstResult) {
            return createErrorResponse(
              "getting TV recommendations",
              new Error(`No TV series found matching title: ${title}`)
            );
          }
          tvId = firstResult.id;
          sourceShowTitle = firstResult.name;
        }

        if (!tvId) {
          return createErrorResponse(
            "getting TV recommendations",
            new Error("Could not determine TV series ID")
          );
        }

        if (!sourceShowTitle) {
          const tvDetails = await tmdbClient.getTvDetails(tvId);
          sourceShowTitle = tvDetails.name;
        }

        const result = await tmdbClient.getTvRecommendations(tvId, { page });

        const formattedResults = result.results.map((show) => ({
          tmdbId: show.id,
          title: show.name,
          originalTitle: show.original_name,
          year: extractYear(show.first_air_date),
          firstAirDate: show.first_air_date || "N/A",
          overview: truncateText(show.overview || "", 200),
          tmdbRating: show.vote_average,
          voteCount: show.vote_count,
          posterUrl: tmdbClient.getImageUrl(show.poster_path, "w342"),
        }));

        return createSuccessResponse({
          sourceShow: {
            tmdbId: tvId,
            title: sourceShowTitle,
          },
          recommendations: formattedResults,
          totalResults: result.total_results,
          page: result.page,
          totalPages: Math.min(result.total_pages, 500),
        });
      } catch (error) {
        return createErrorResponse("getting TV recommendations", error);
      }
    }
  );
};
