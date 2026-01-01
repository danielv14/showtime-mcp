# Showtime MCP

## Project Overview

This is an MCP (Model Context Protocol) server that provides tools to search and retrieve information about movies, TV series, and episodes. Powered by OMDB and TMDB APIs.

## Tech Stack

- **Runtime**: Bun
- **MCP SDK**: @modelcontextprotocol/sdk (stdio transport)
- **HTTP Client**: ky (fetch wrapper)
- **Validation**: zod

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── omdb-api/             # OMDB API client module
│   ├── index.ts          # Re-exports types and client
│   ├── types.ts          # TypeScript types for OMDB responses
│   └── client.ts         # OMDB API wrapper using ky
├── tmdb-api/             # TMDB API client module
│   ├── index.ts          # Re-exports types and client
│   ├── types.ts          # TypeScript types for TMDB responses
│   └── client.ts         # TMDB API wrapper using ky
└── tools/                # MCP tool implementations
    ├── index.ts          # Registers all tools
    │
    │   # TMDB-powered tools
    ├── search-movies.ts      # Search movies by title (TMDB)
    ├── search-person.ts      # Search actors/directors by name
    ├── discover-movies.ts    # Discover movies with filters
    ├── get-where-to-watch.ts # Find streaming/rental options
    ├── get-filmography.ts    # Get person's filmography
    │
    │   # Hybrid tools (OMDB + TMDB)
    ├── get-movie.ts          # Get movie details (ratings from OMDB, cast/images from TMDB)
    │
    │   # OMDB-only tools (TV series)
    ├── search-series.ts
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
- `TMDB_API_KEY` - Required. Get from https://www.themoviedb.org/settings/api

## API Strategy

| Capability | OMDB | TMDB | Usage |
|------------|------|------|-------|
| Search movies | Basic | Advanced (fuzzy) | TMDB |
| Search people | No | Yes | TMDB |
| Discover/filter | No | Yes (30+ filters) | TMDB |
| Ratings | IMDb + RT + Metacritic | TMDB only | OMDB |
| Box office | Detailed | Basic | OMDB |
| Awards | Yes | No | OMDB |
| Images | Poster only | Posters, backdrops, profiles | TMDB |
| Cast/Crew | Basic list | Full filmographies | TMDB |
| Streaming providers | No | Yes (via JustWatch) | TMDB |

## Development Notes

- Bun automatically loads .env files, no dotenv needed
- Use const arrow functions: `const foo = () => {}`
- Be explicit with variable names (e.g., `omdbClient` not `client`)
- The server uses stdio transport for local Claude Code integration
- All tools return JSON-formatted text content
- TMDB API uses Bearer token authentication (API Read Access Token)
