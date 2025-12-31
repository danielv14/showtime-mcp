import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createOmdbClient } from "./omdb-api/index.js";
import { registerAllTools } from "./tools/index.js";

const OMDB_API_KEY = process.env.OMDB_API_KEY;

if (!OMDB_API_KEY) {
  console.error("Error: OMDB_API_KEY environment variable is required");
  console.error("Get your API key from https://www.omdbapi.com/apikey.aspx");
  process.exit(1);
}

const server = new McpServer({
  name: "omdb-api",
  version: "1.0.0",
});

const omdbClient = createOmdbClient(OMDB_API_KEY);

registerAllTools(server, omdbClient);

const transport = new StdioServerTransport();
await server.connect(transport);
