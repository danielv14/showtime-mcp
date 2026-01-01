# Showtime MCP

An MCP (Model Context Protocol) server that provides tools to search and retrieve information about movies, TV series, actors, and more. Powered by TMDB and OMDB APIs for comprehensive movie data including ratings, streaming availability, and recommendations.

## Features

- **Movie Search & Discovery** - Search movies, discover by genre/year/rating, find trending content
- **TV Series Support** - Search series, get episode details, season information
- **People Search** - Find actors, directors, and their complete filmographies
- **Recommendations** - Get movie and TV recommendations based on what you like
- **Collections** - Explore movie franchises (Marvel, Harry Potter, etc.)
- **Streaming Info** - Find where to watch movies (Netflix, HBO, etc.)
- **Rich Metadata** - Ratings from IMDb, Rotten Tomatoes, Metacritic, plus cast, crew, and images

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- API keys for:
  - **TMDB** (required) - Get one at https://www.themoviedb.org/settings/api
  - **OMDB** (required) - Get one at https://www.omdbapi.com/apikey.aspx

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/showtime-mcp.git
   cd showtime-mcp
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Add your API keys to `.env`:
   ```
   OMDB_API_KEY=your_omdb_api_key
   TMDB_API_KEY=your_tmdb_api_read_access_token
   ```

### Adding to Claude Code

Add the following to your Claude Code MCP settings file (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "showtime": {
      "command": "bun",
      "args": ["run", "/path/to/showtime-mcp/src/index.ts"],
      "env": {
        "OMDB_API_KEY": "your_omdb_api_key",
        "TMDB_API_KEY": "your_tmdb_api_read_access_token"
      }
    }
  }
}
```

> **Note:** Replace `/path/to/showtime-mcp` with the actual path where you cloned the repository.

After adding the configuration, restart Claude Code for the changes to take effect.

### Adding to OpenCode

Add the following to your OpenCode config file (`opencode.json` in your project or `~/.config/opencode/config.json` globally):

```json
{
  "mcp": {
    "showtime": {
      "type": "local",
      "command": ["bun", "run", "/path/to/showtime-mcp/src/index.ts"],
      "env": {
        "OMDB_API_KEY": "your_omdb_api_key",
        "TMDB_API_KEY": "your_tmdb_api_read_access_token"
      }
    }
  }
}
```

## Available Tools

### Movie Tools

| Tool | Description |
|------|-------------|
| `search_movies` | Search for movies by title |
| `get_movie` | Get detailed movie information (ratings, cast, crew, images) |
| `discover_movies` | Discover movies by genre, year, rating, actor, or director |
| `get_movie_recommendations` | Get movie recommendations based on a specific movie |
| `get_collection` | Get all movies in a franchise/collection |
| `get_where_to_watch` | Find streaming/rental/purchase options for a movie |

### TV Series Tools

| Tool | Description |
|------|-------------|
| `search_series` | Search for TV series by title |
| `get_series` | Get detailed TV series information |
| `get_season` | Get all episodes in a specific season |
| `get_episode` | Get details about a specific episode |
| `get_all_episodes` | Get all episodes across all seasons |
| `get_tv_recommendations` | Get TV recommendations based on a specific show |

### People & Discovery Tools

| Tool | Description |
|------|-------------|
| `search_person` | Search for actors, directors, and crew members |
| `get_filmography` | Get a person's complete filmography |
| `get_trending` | Get trending movies and TV shows |

## Example Prompts

Try these prompts to explore what Showtime MCP can do:

### Finding Movies
- "Search for movies with 'inception' in the title"
- "Find sci-fi movies from 2023 with a rating above 7"
- "What are the top trending movies this week?"

### Movie Details & Recommendations
- "Get me detailed info about The Shawshank Redemption including cast and ratings"
- "I loved Interstellar, what similar movies would you recommend?"
- "Show me all the movies in the Marvel Cinematic Universe collection"

### Streaming & Watch Options
- "Where can I stream Oppenheimer?"
- "Is Dune available on Netflix?"

### TV Series
- "Search for TV series about dragons"
- "Get details about Breaking Bad including total seasons"
- "Show me all episodes of Stranger Things season 4"
- "I just finished The Bear, what similar shows should I watch?"

### Actors & Directors
- "Find movies directed by Christopher Nolan"
- "What movies has Florence Pugh been in recently?"
- "Show me Leonardo DiCaprio's filmography sorted by rating"

### Discovery
- "Find highly-rated Korean movies"
- "What horror movies came out in 2024?"
- "Show me comedy movies with Ryan Gosling"

## Development

```bash
# Install dependencies
bun install

# Run type checking
bun run typecheck

# Start the MCP server (for testing)
bun run start
```

## License

MIT
