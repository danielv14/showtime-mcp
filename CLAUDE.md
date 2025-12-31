# OMDB API MCP Server

## Project Overview

This is an MCP (Model Context Protocol) server that provides tools to search and retrieve information about movies, TV series, and episodes from the OMDB API.

## Tech Stack

- **Runtime**: Bun
- **MCP SDK**: @modelcontextprotocol/sdk (stdio transport)
- **HTTP Client**: ky (fetch wrapper)
- **Validation**: zod

## Project Structure

```
src/
├── index.ts          # MCP server entry point
├── omdb-api/         # OMDB API client module
│   ├── index.ts      # Re-exports types and client
│   ├── types.ts      # TypeScript types for OMDB responses
│   └── client.ts     # OMDB API wrapper using ky
└── tools/            # MCP tool implementations
    ├── index.ts
    ├── search-movies.ts
    ├── search-series.ts
    ├── get-movie.ts
    ├── get-series.ts
    ├── get-episode.ts
    ├── get-season.ts
    └── get-all-episodes.ts
```

## Commands

- `bun install` - Install dependencies
- `bun run start` - Start the MCP server
- `bun run typecheck` - Run TypeScript type checking

## Environment Variables

- `OMDB_API_KEY` - Required. Get from https://www.omdbapi.com/apikey.aspx

## Development Notes

- Bun automatically loads .env files, no dotenv needed
- Use const arrow functions: `const foo = () => {}`
- Be explicit with variable names (e.g., `omdbClient` not `client`)
- The server uses stdio transport for local Claude Code integration
- All tools return JSON-formatted text content
