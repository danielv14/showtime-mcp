import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";
import type { TmdbClient } from "../tmdb-api/index.js";

// TMDB-powered tools
import { registerSearchMoviesTool } from "./search-movies.js";
import { registerSearchPersonTool } from "./search-person.js";
import { registerDiscoverMoviesTool } from "./discover-movies.js";
import { registerGetWhereToWatchTool } from "./get-where-to-watch.js";
import { registerGetFilmographyTool } from "./get-filmography.js";
import { registerGetTrendingTool } from "./get-trending.js";
import { registerGetRecommendationsTool } from "./get-recommendations.js";
import { registerGetCollectionTool } from "./get-collection.js";
import { registerGetTvRecommendationsTool } from "./get-tv-recommendations.js";

// Hybrid tools (OMDB + TMDB)
import { registerGetMovieTool } from "./get-movie.js";

// OMDB-only tools (TV series)
import { registerSearchSeriesTool } from "./search-series.js";
import { registerGetSeriesTool } from "./get-series.js";
import { registerGetEpisodeTool } from "./get-episode.js";
import { registerGetSeasonTool } from "./get-season.js";
import { registerGetAllEpisodesTool } from "./get-all-episodes.js";

export const registerAllTools = (
  server: McpServer,
  omdbClient: OmdbClient,
  tmdbClient: TmdbClient
) => {
  // TMDB-powered movie tools
  registerSearchMoviesTool(server, tmdbClient);
  registerSearchPersonTool(server, tmdbClient);
  registerDiscoverMoviesTool(server, tmdbClient);
  registerGetWhereToWatchTool(server, tmdbClient);
  registerGetFilmographyTool(server, tmdbClient);
  registerGetTrendingTool(server, tmdbClient);
  registerGetRecommendationsTool(server, tmdbClient);
  registerGetCollectionTool(server, tmdbClient);
  registerGetTvRecommendationsTool(server, tmdbClient);

  // Hybrid tool (combines OMDB ratings with TMDB data)
  registerGetMovieTool(server, omdbClient, tmdbClient);

  // OMDB-only tools (TV series support)
  registerSearchSeriesTool(server, omdbClient);
  registerGetSeriesTool(server, omdbClient);
  registerGetEpisodeTool(server, omdbClient);
  registerGetSeasonTool(server, omdbClient);
  registerGetAllEpisodesTool(server, omdbClient);
};
