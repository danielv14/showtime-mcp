import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "../omdb-api/index.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  requireAtLeastOne,
} from "./helpers.js";

export const registerGetMovieTool = (
  server: McpServer,
  omdbClient: OmdbClient,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_movie",
    {
      title: "Get Movie Details",
      description:
        "Get detailed information about a specific movie. Combines OMDB data (ratings, box office, awards) with TMDB data (cast, crew, images). Provide either imdbId, tmdbId, or title.",
      inputSchema: {
        imdbId: z
          .string()
          .optional()
          .describe("IMDb ID of the movie (e.g., 'tt0111161')"),
        tmdbId: z
          .number()
          .optional()
          .describe("TMDB ID of the movie"),
        title: z
          .string()
          .optional()
          .describe("Exact title of the movie to look up"),
        year: z
          .string()
          .optional()
          .describe("Year of release (helps disambiguate titles)"),
        plot: z
          .enum(["short", "full"])
          .optional()
          .describe("Plot length: 'short' (default) or 'full'"),
        includeCredits: z
          .boolean()
          .optional()
          .describe("Include top cast and crew (default: true)"),
      },
    },
    async ({ imdbId, tmdbId, title, year, plot, includeCredits = true }) => {
      try {
        const validationError = requireAtLeastOne("getting movie details", {
          imdbId,
          tmdbId,
          title,
        });
        if (validationError) return validationError;

        let finalImdbId: string | undefined = imdbId;
        let finalTmdbId: number | undefined = tmdbId;

        // If we have TMDB ID but not IMDB ID, get IMDB ID from TMDB
        if (tmdbId && !imdbId) {
          const tmdbDetails = await tmdbClient.getMovieDetails(tmdbId);
          finalImdbId = tmdbDetails.imdb_id || undefined;
          finalTmdbId = tmdbDetails.id;
        }

        // If we have title but no IDs, search TMDB first (better search)
        if (!finalImdbId && !finalTmdbId && title) {
          const searchResult = await tmdbClient.searchMovies(title, {
            year: year ? parseInt(year) : undefined,
          });
          const firstResult = searchResult.results[0];
          if (firstResult) {
            finalTmdbId = firstResult.id;
            const tmdbDetails = await tmdbClient.getMovieDetails(finalTmdbId);
            finalImdbId = tmdbDetails.imdb_id || undefined;
          }
        }

        // Get OMDB data (primary source for ratings, box office, awards)
        let omdbResult;
        if (finalImdbId) {
          omdbResult = await omdbClient.getById({ imdbId: finalImdbId, plot });
        } else if (title) {
          omdbResult = await omdbClient.getByTitle({
            title,
            type: "movie",
            year,
            plot,
          });
          finalImdbId = omdbResult.imdbID;
        }

        if (!omdbResult || omdbResult.Type !== "movie") {
          return createErrorResponse(
            "getting movie details",
            new Error(
              omdbResult
                ? `The result is a ${omdbResult.Type}, not a movie. Use the appropriate tool for ${omdbResult.Type}.`
                : "Movie not found"
            )
          );
        }

        // Get TMDB data for additional info
        let tmdbDetails;
        let tmdbCredits;

        if (finalTmdbId) {
          [tmdbDetails, tmdbCredits] = await Promise.all([
            tmdbClient.getMovieDetails(finalTmdbId),
            includeCredits ? tmdbClient.getMovieCredits(finalTmdbId) : null,
          ]);
        } else if (finalImdbId) {
          // Try to find TMDB ID from IMDB ID
          tmdbDetails = await tmdbClient.getMovieByImdbId(finalImdbId);
          if (tmdbDetails && includeCredits) {
            tmdbCredits = await tmdbClient.getMovieCredits(tmdbDetails.id);
          }
        }

        // Build enriched output
        const output: Record<string, unknown> = {
          // Basic info (from OMDB)
          title: omdbResult.Title,
          year: omdbResult.Year,
          rated: omdbResult.Rated,
          released: omdbResult.Released,
          runtime: omdbResult.Runtime,
          genre: omdbResult.Genre,
          plot: omdbResult.Plot,
          language: omdbResult.Language,
          country: omdbResult.Country,

          // IDs
          imdbId: omdbResult.imdbID,
          tmdbId: tmdbDetails?.id,

          // Ratings (from OMDB - aggregated)
          ratings: omdbResult.Ratings,
          metascore: omdbResult.Metascore,
          imdbRating: omdbResult.imdbRating,
          imdbVotes: omdbResult.imdbVotes,
          tmdbRating: tmdbDetails?.vote_average,
          tmdbVoteCount: tmdbDetails?.vote_count,

          // Box office & Awards (from OMDB)
          boxOffice: omdbResult.BoxOffice,
          awards: omdbResult.Awards,

          // Budget & Revenue (from TMDB)
          budget: tmdbDetails?.budget,
          revenue: tmdbDetails?.revenue,

          // Basic credits (from OMDB)
          director: omdbResult.Director,
          writer: omdbResult.Writer,
          actors: omdbResult.Actors,

          // Images (from TMDB - higher quality)
          posterUrl: tmdbDetails
            ? tmdbClient.getImageUrl(tmdbDetails.poster_path, "w500")
            : omdbResult.Poster !== "N/A"
              ? omdbResult.Poster
              : null,
          backdropUrl: tmdbDetails
            ? tmdbClient.getImageUrl(tmdbDetails.backdrop_path, "w1280")
            : null,

          // Tagline & Overview (from TMDB)
          tagline: tmdbDetails?.tagline,
          overview: tmdbDetails?.overview,

          // Genres (from TMDB - structured)
          genres: tmdbDetails?.genres.map((g) => g.name),

          // Production info (from TMDB)
          productionCompanies: tmdbDetails?.production_companies.map(
            (c) => c.name
          ),
        };

        // Add detailed credits from TMDB if available
        if (tmdbCredits) {
          output.cast = tmdbCredits.cast.slice(0, 10).map((member) => ({
            name: member.name,
            character: member.character,
            tmdbId: member.id,
            profileImageUrl: tmdbClient.getImageUrl(member.profile_path, "w185"),
          }));

          // Get key crew members
          const directors = tmdbCredits.crew.filter(
            (member) => member.job === "Director"
          );
          const writers = tmdbCredits.crew.filter(
            (member) =>
              member.department === "Writing" ||
              member.job === "Screenplay" ||
              member.job === "Writer"
          );
          const composers = tmdbCredits.crew.filter(
            (member) => member.job === "Original Music Composer"
          );
          const cinematographers = tmdbCredits.crew.filter(
            (member) => member.job === "Director of Photography"
          );

          output.crew = {
            directors: directors.map((d) => ({
              name: d.name,
              tmdbId: d.id,
            })),
            writers: writers.slice(0, 5).map((w) => ({
              name: w.name,
              job: w.job,
              tmdbId: w.id,
            })),
            composers: composers.map((c) => ({
              name: c.name,
              tmdbId: c.id,
            })),
            cinematographers: cinematographers.map((c) => ({
              name: c.name,
              tmdbId: c.id,
            })),
          };
        }

        return createSuccessResponse(output);
      } catch (error) {
        return createErrorResponse("getting movie details", error);
      }
    }
  );
};
