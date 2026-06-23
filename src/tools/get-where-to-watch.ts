import { z } from "zod";
import { defineTool, failWith } from "./define-tool.js";
import { requireAtLeastOne, resolveMovieId, resolveTvId } from "./helpers/resolvers.js";

export const getWhereToWatchTool = defineTool({
  name: "get_where_to_watch",
  title: "Get Where to Watch",
  description:
    "Find streaming services, rental options, and purchase options for a movie or TV series. Powered by JustWatch data via TMDB.",
  schema: {
    mediaType: z
      .enum(["movie", "tv"])
      .optional()
      .describe(
        "Whether to look up a movie or a TV series (default: 'movie'). A tmdbId must match this type."
      ),
    title: z
      .string()
      .optional()
      .describe("Movie or TV series title to search for"),
    tmdbId: z
      .number()
      .optional()
      .describe(
        "TMDB ID of the movie or TV series (more accurate than title search). Must match mediaType."
      ),
    imdbId: z
      .string()
      .optional()
      .describe("IMDb ID (e.g., 'tt0111161'). Movie lookups only; ignored for TV."),
    region: z
      .string()
      .optional()
      .describe(
        "Country code for regional availability (default: 'US'). Examples: 'US', 'GB', 'CA', 'AU', 'DE', 'FR'"
      ),
  },
  handler: async (
    { mediaType = "movie", title, tmdbId, imdbId, region = "US" },
    { tmdb }
  ) => {
    const guardError = requireAtLeastOne("getting watch providers", {
      title,
      tmdbId,
      imdbId,
    });
    if (guardError) return failWith(guardError);

    let mediaId: number;
    let mediaTitle: string;
    let watchProviders;

    if (mediaType === "tv") {
      if (imdbId && !tmdbId && !title) {
        throw new Error(
          "IMDb ID lookup is only supported for movies. For TV series, provide a tmdbId or title."
        );
      }

      const resolved = await resolveTvId(tmdb, "getting watch providers", {
        tmdbId,
        title,
      });
      if (!resolved.success) return failWith(resolved.error);

      mediaId = resolved.tv.id;
      mediaTitle = resolved.tv.name;
      watchProviders = await tmdb.getTvWatchProviders(mediaId);
    } else {
      const resolved = await resolveMovieId(tmdb, "getting watch providers", {
        tmdbId,
        imdbId,
        title,
      });
      if (!resolved.success) return failWith(resolved.error);

      mediaId = resolved.movie.id;
      mediaTitle = resolved.movie.title;
      watchProviders = await tmdb.getWatchProviders(mediaId);
    }

    const regionData = watchProviders.results[region.toUpperCase()];

    if (!regionData) {
      return {
        mediaType,
        mediaTitle,
        tmdbId: mediaId,
        region: region.toUpperCase(),
        message: `No streaming/rental/purchase options available in ${region.toUpperCase()}`,
        availableRegions: Object.keys(watchProviders.results).slice(0, 20),
      };
    }

    const formatProviders = (
      providers?: Array<{ provider_name: string; logo_path: string }>
    ) => {
      if (!providers || providers.length === 0) return [];
      return providers.map((provider) => ({
        name: provider.provider_name,
        logoUrl: tmdb.getImageUrl(provider.logo_path, "w92"),
      }));
    };

    return {
      mediaType,
      mediaTitle,
      tmdbId: mediaId,
      region: region.toUpperCase(),
      justWatchLink: regionData.link,
      streaming: formatProviders(regionData.flatrate),
      rent: formatProviders(regionData.rent),
      buy: formatProviders(regionData.buy),
      freeWithAds: formatProviders(regionData.free),
    };
  },
});
