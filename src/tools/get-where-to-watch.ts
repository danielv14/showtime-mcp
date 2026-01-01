import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  requireAtLeastOne,
} from "./helpers.js";

export const registerGetWhereToWatchTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_where_to_watch",
    {
      title: "Get Where to Watch",
      description:
        "Find streaming services, rental options, and purchase options for a movie. Powered by JustWatch data via TMDB.",
      inputSchema: {
        title: z
          .string()
          .optional()
          .describe("Movie title to search for"),
        tmdbId: z
          .number()
          .optional()
          .describe("TMDB movie ID (more accurate than title search)"),
        imdbId: z
          .string()
          .optional()
          .describe("IMDb ID of the movie (e.g., 'tt0111161')"),
        region: z
          .string()
          .optional()
          .describe("Country code for regional availability (default: 'US'). Examples: 'US', 'GB', 'CA', 'AU', 'DE', 'FR'"),
      },
    },
    async ({ title, tmdbId, imdbId, region = "US" }) => {
      try {
        const validationError = requireAtLeastOne("getting watch providers", {
          title,
          tmdbId,
          imdbId,
        });
        if (validationError) return validationError;

        let movieId: number | undefined = tmdbId;
        let movieTitle: string | undefined;

        // Find TMDB movie ID if not provided
        if (!movieId) {
          if (imdbId) {
            const movie = await tmdbClient.getMovieByImdbId(imdbId);
            if (!movie) {
              return createErrorResponse("getting watch providers", new Error(`Movie not found for IMDb ID: ${imdbId}`));
            }
            movieId = movie.id;
            movieTitle = movie.title;
          } else if (title) {
            const searchResult = await tmdbClient.searchMovies(title);
            const firstResult = searchResult.results[0];
            if (!firstResult) {
              return createErrorResponse("getting watch providers", new Error(`No movies found matching title: ${title}`));
            }
            movieId = firstResult.id;
            movieTitle = firstResult.title;
          }
        }

        if (!movieId) {
          return createErrorResponse("getting watch providers", new Error("Could not determine movie ID"));
        }

        // Get movie title if we don't have it yet
        if (!movieTitle) {
          const movieDetails = await tmdbClient.getMovieDetails(movieId);
          movieTitle = movieDetails.title;
        }

        // Get watch providers
        const watchProviders = await tmdbClient.getWatchProviders(movieId);
        const regionData = watchProviders.results[region.toUpperCase()];

        if (!regionData) {
          return createSuccessResponse({
            movieTitle,
            tmdbId: movieId,
            region: region.toUpperCase(),
            message: `No streaming/rental/purchase options available in ${region.toUpperCase()}`,
            availableRegions: Object.keys(watchProviders.results).slice(0, 20),
          });
        }

        const formatProviders = (providers?: Array<{ provider_name: string; logo_path: string }>) => {
          if (!providers || providers.length === 0) return [];
          return providers.map((provider) => ({
            name: provider.provider_name,
            logoUrl: tmdbClient.getImageUrl(provider.logo_path, "w92"),
          }));
        };

        return createSuccessResponse({
          movieTitle,
          tmdbId: movieId,
          region: region.toUpperCase(),
          justWatchLink: regionData.link,
          streaming: formatProviders(regionData.flatrate),
          rent: formatProviders(regionData.rent),
          buy: formatProviders(regionData.buy),
          freeWithAds: formatProviders(regionData.free),
        });
      } catch (error) {
        return createErrorResponse("getting watch providers", error);
      }
    }
  );
};
