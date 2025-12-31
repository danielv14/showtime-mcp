import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";
import { registerSearchMoviesTool } from "./search-movies.js";
import { registerSearchSeriesTool } from "./search-series.js";
import { registerGetMovieTool } from "./get-movie.js";
import { registerGetSeriesTool } from "./get-series.js";
import { registerGetEpisodeTool } from "./get-episode.js";
import { registerGetSeasonTool } from "./get-season.js";
import { registerGetAllEpisodesTool } from "./get-all-episodes.js";

export const registerAllTools = (server: McpServer, omdbClient: OmdbClient) => {
  registerSearchMoviesTool(server, omdbClient);
  registerSearchSeriesTool(server, omdbClient);
  registerGetMovieTool(server, omdbClient);
  registerGetSeriesTool(server, omdbClient);
  registerGetEpisodeTool(server, omdbClient);
  registerGetSeasonTool(server, omdbClient);
  registerGetAllEpisodesTool(server, omdbClient);
};
