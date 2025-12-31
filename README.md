# OMDB API MCP Server

An MCP (Model Context Protocol) server that provides tools to search and retrieve information about movies, TV series, and episodes from the OMDB API.

## Prerequisites

- [Bun](https://bun.sh) runtime
- OMDB API key (get one at https://www.omdbapi.com/apikey.aspx)

## Installation

```bash
bun install
```

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Add your OMDB API key to `.env`:
   ```
   OMDB_API_KEY=your_api_key_here
   ```

## Claude Code Integration

Add the following to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "omdb": {
      "command": "bun",
      "args": ["run", "/Users/daniel.vernberg/dev-personal/omdb-api-mcp-server/src/index.ts"],
      "env": {
        "OMDB_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `search_movies` | Search for movies by title |
| `search_series` | Search for TV series by title |
| `get_movie` | Get detailed movie information by IMDb ID or title |
| `get_series` | Get detailed TV series information by IMDb ID or title |
| `get_episode` | Get specific episode details for a TV series |

## Usage Examples

Once configured, you can ask Claude Code things like:

- "Search for movies with 'inception' in the title"
- "Get details about the TV series Breaking Bad"
- "Find the rating for the movie The Shawshank Redemption"
- "Get information about season 1, episode 1 of The Office"
