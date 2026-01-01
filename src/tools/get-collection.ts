import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import {
  createSuccessResponse,
  createErrorResponse,
  extractYear,
  truncateText,
  requireAtLeastOne,
} from "./helpers.js";

export const registerGetCollectionTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_collection",
    {
      title: "Get Movie Collection",
      description:
        "Get all movies in a collection/franchise (e.g., all Marvel movies, all Harry Potter movies). You can search by collection ID or find a collection by providing a movie from that collection.",
      inputSchema: {
        collectionId: z
          .number()
          .optional()
          .describe("TMDB collection ID"),
        movieTmdbId: z
          .number()
          .optional()
          .describe(
            "TMDB movie ID - will find the collection this movie belongs to"
          ),
        movieTitle: z
          .string()
          .optional()
          .describe(
            "Movie title - will find the collection this movie belongs to"
          ),
      },
    },
    async ({ collectionId, movieTmdbId, movieTitle }) => {
      try {
        const validationError = requireAtLeastOne("getting collection", {
          collectionId,
          movieTmdbId,
          movieTitle,
        });
        if (validationError) return validationError;

        let finalCollectionId: number | undefined = collectionId;

        // Find collection from movie if not provided directly
        if (!finalCollectionId) {
          let movieId: number | undefined = movieTmdbId;

          // Search for movie by title if needed
          if (!movieId && movieTitle) {
            const searchResult = await tmdbClient.searchMovies(movieTitle);
            const firstResult = searchResult.results[0];
            if (!firstResult) {
              return createErrorResponse(
                "getting collection",
                new Error(`No movies found matching title: ${movieTitle}`)
              );
            }
            movieId = firstResult.id;
          }

          if (!movieId) {
            return createErrorResponse(
              "getting collection",
              new Error("Could not determine movie ID")
            );
          }

          // Get movie details to find collection
          const movieDetails = await tmdbClient.getMovieDetails(movieId);
          if (!movieDetails.belongs_to_collection) {
            return createErrorResponse(
              "getting collection",
              new Error(
                `"${movieDetails.title}" is not part of a collection/franchise`
              )
            );
          }

          finalCollectionId = movieDetails.belongs_to_collection.id;
        }

        // Get collection details
        const collection = await tmdbClient.getCollection(finalCollectionId);

        // Sort movies by release date
        const sortedMovies = [...collection.parts].sort((a, b) => {
          const dateA = a.release_date || "";
          const dateB = b.release_date || "";
          return dateA.localeCompare(dateB);
        });

        const formattedMovies = sortedMovies.map((movie, index) => ({
          order: index + 1,
          tmdbId: movie.id,
          title: movie.title,
          year: extractYear(movie.release_date),
          releaseDate: movie.release_date || "N/A",
          overview: truncateText(movie.overview || "", 200),
          tmdbRating: movie.vote_average,
          voteCount: movie.vote_count,
          posterUrl: tmdbClient.getImageUrl(movie.poster_path, "w342"),
        }));

        return createSuccessResponse({
          collectionId: collection.id,
          name: collection.name,
          overview: collection.overview || "No overview available",
          posterUrl: tmdbClient.getImageUrl(collection.poster_path, "w500"),
          backdropUrl: tmdbClient.getImageUrl(collection.backdrop_path, "w1280"),
          totalMovies: collection.parts.length,
          movies: formattedMovies,
        });
      } catch (error) {
        return createErrorResponse("getting collection", error);
      }
    }
  );
};
