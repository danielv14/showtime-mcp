import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { registerTool, type AnyToolDefinition } from "./define-tool.js";

// Migrated tools (defineTool seam)
import { searchMoviesTool } from "./search-movies.js";
import { searchPersonTool } from "./search-person.js";
import { discoverMoviesTool } from "./discover-movies.js";
import { discoverTvTool } from "./discover-tv.js";
import { getTrendingTool } from "./get-trending.js";
import { getMovieRecommendationsTool } from "./get-recommendations.js";
import { getTvRecommendationsTool } from "./get-tv-recommendations.js";
import { getCollectionTool } from "./get-collection.js";
import { getVideosTool } from "./get-videos.js";
import { getNowPlayingTool } from "./get-now-playing.js";
import { getUpcomingTool } from "./get-upcoming.js";
import { getAiringTodayTool } from "./get-airing-today.js";
import { getPersonDetailsTool } from "./get-person-details.js";
import { multiSearchTool } from "./multi-search.js";
import { searchSeriesTool } from "./search-series.js";
import { getSeriesTool } from "./get-series.js";
import { getEpisodeTool } from "./get-episode.js";
import { getSeasonTool } from "./get-season.js";
import { getAllEpisodesTool } from "./get-all-episodes.js";

// Tools not yet migrated (hybrid + media-seam slices)
import { registerGetWhereToWatchTool } from "./get-where-to-watch.js";
import { registerGetFilmographyTool } from "./get-filmography.js";
import { registerGetSimilarTool } from "./get-similar.js";
import { registerGetReviewsTool } from "./get-reviews.js";
import { registerGetMovieTool } from "./get-movie.js";

/** Tools migrated to the defineTool seam; registered through a single loop. */
const toolDefinitions: AnyToolDefinition[] = [
  searchMoviesTool,
  searchPersonTool,
  discoverMoviesTool,
  discoverTvTool,
  getTrendingTool,
  getMovieRecommendationsTool,
  getTvRecommendationsTool,
  getCollectionTool,
  getVideosTool,
  getNowPlayingTool,
  getUpcomingTool,
  getAiringTodayTool,
  getPersonDetailsTool,
  multiSearchTool,
  searchSeriesTool,
  getSeriesTool,
  getEpisodeTool,
  getSeasonTool,
  getAllEpisodesTool,
];

export const registerAllTools = (
  server: McpServer,
  omdbClient: OmdbClient,
  tmdbClient: TmdbClient
) => {
  const clients = { tmdb: tmdbClient, omdb: omdbClient };
  for (const definition of toolDefinitions) {
    registerTool(server, definition, clients);
  }

  // Not yet migrated to the defineTool seam.
  registerGetWhereToWatchTool(server, tmdbClient);
  registerGetFilmographyTool(server, tmdbClient);
  registerGetSimilarTool(server, tmdbClient);
  registerGetReviewsTool(server, tmdbClient);
  registerGetMovieTool(server, omdbClient, tmdbClient);
};
