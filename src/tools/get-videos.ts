import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient, TmdbVideo } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers/response.js";
import { requireAtLeastOne } from "./helpers/resolvers.js";

const formatVideo = (video: TmdbVideo) => {
  const videoUrl =
    video.site === "YouTube"
      ? `https://www.youtube.com/watch?v=${video.key}`
      : video.site === "Vimeo"
        ? `https://vimeo.com/${video.key}`
        : null;

  return {
    id: video.id,
    name: video.name,
    type: video.type,
    site: video.site,
    key: video.key,
    url: videoUrl,
    size: video.size,
    official: video.official,
    publishedAt: video.published_at,
  };
};

export const registerGetVideosTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_videos",
    {
      title: "Get Videos",
      description:
        "Get trailers, teasers, clips, and behind-the-scenes videos for movies and TV shows. Returns YouTube/Vimeo links.",
      inputSchema: {
        movieId: z
          .number()
          .optional()
          .describe("TMDB movie ID (use search_movies to find IDs)"),
        tvId: z
          .number()
          .optional()
          .describe("TMDB TV series ID (use search_series to find IDs)"),
        type: z
          .enum(["Trailer", "Teaser", "Clip", "Behind the Scenes", "Featurette", "all"])
          .optional()
          .describe("Filter by video type (default: all)"),
      },
    },
    async ({ movieId, tvId, type = "all" }) => {
      const validationError = requireAtLeastOne("getting videos", {
        movieId,
        tvId,
      });
      if (validationError) return validationError;

      try {
        let videos: TmdbVideo[] = [];
        let mediaTitle: string = "";
        let mediaType: "movie" | "tv" = "movie";

        if (movieId) {
          const [videosResponse, movieDetails] = await Promise.all([
            tmdbClient.getMovieVideos(movieId),
            tmdbClient.getMovieDetails(movieId),
          ]);
          videos = videosResponse.results;
          mediaTitle = movieDetails.title;
          mediaType = "movie";
        } else if (tvId) {
          const [videosResponse, tvDetails] = await Promise.all([
            tmdbClient.getTvVideos(tvId),
            tmdbClient.getTvDetails(tvId),
          ]);
          videos = videosResponse.results;
          mediaTitle = tvDetails.name;
          mediaType = "tv";
        }

        // Filter by type if specified
        if (type !== "all") {
          videos = videos.filter((v) => v.type === type);
        }

        // Sort: official first, then by publish date (newest first)
        videos.sort((a, b) => {
          if (a.official !== b.official) return a.official ? -1 : 1;
          return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        });

        const formattedVideos = videos.map(formatVideo);

        return createSuccessResponse({
          mediaType,
          mediaTitle,
          mediaId: movieId || tvId,
          videos: formattedVideos,
          totalVideos: formattedVideos.length,
          filter: type,
        });
      } catch (error) {
        return createErrorResponse("getting videos", error);
      }
    }
  );
};
