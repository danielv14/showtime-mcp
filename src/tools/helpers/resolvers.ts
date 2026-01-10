import type { TmdbClient } from "../../tmdb-api/client.js";
import { createErrorResponse } from "./response.js";

export const requireAtLeastOne = (
  context: string,
  fields: Record<string, unknown>
): ReturnType<typeof createErrorResponse> | null => {
  const hasValue = Object.values(fields).some(
    (v) => v !== undefined && v !== null
  );
  if (!hasValue) {
    const fieldNames = Object.keys(fields)
      .map((f) => `'${f}'`)
      .join(", ");
    return createErrorResponse(
      context,
      new Error(`At least one of ${fieldNames} must be provided`)
    );
  }
  return null;
};

/** Result type for movie ID resolution */
export type ResolvedMovie = { id: number; title: string };

/** Result type for TV ID resolution */
export type ResolvedTv = { id: number; name: string };

/**
 * Resolve a movie ID from various inputs (tmdbId, imdbId, or title).
 * Returns the resolved movie ID and title, or an error response.
 */
export const resolveMovieId = async (
  tmdbClient: TmdbClient,
  context: string,
  options: { tmdbId?: number; imdbId?: string; title?: string }
): Promise<
  | { success: true; movie: ResolvedMovie }
  | { success: false; error: ReturnType<typeof createErrorResponse> }
> => {
  const { tmdbId, imdbId, title } = options;

  // If tmdbId is provided, fetch details to get the title
  if (tmdbId) {
    const details = await tmdbClient.getMovieDetails(tmdbId);
    return { success: true, movie: { id: details.id, title: details.title } };
  }

  // If imdbId is provided, look up via TMDB's find endpoint
  if (imdbId) {
    const movie = await tmdbClient.getMovieByImdbId(imdbId);
    if (!movie) {
      return {
        success: false,
        error: createErrorResponse(
          context,
          new Error(`Movie not found for IMDb ID: ${imdbId}`)
        ),
      };
    }
    return { success: true, movie: { id: movie.id, title: movie.title } };
  }

  // If title is provided, search for it
  if (title) {
    const searchResult = await tmdbClient.searchMovies(title);
    const firstResult = searchResult.results[0];
    if (!firstResult) {
      return {
        success: false,
        error: createErrorResponse(
          context,
          new Error(`No movies found matching title: ${title}`)
        ),
      };
    }
    return {
      success: true,
      movie: { id: firstResult.id, title: firstResult.title },
    };
  }

  return {
    success: false,
    error: createErrorResponse(
      context,
      new Error("Could not determine movie ID")
    ),
  };
};

/**
 * Resolve a TV series ID from various inputs (tmdbId or title).
 * Returns the resolved TV ID and name, or an error response.
 */
export const resolveTvId = async (
  tmdbClient: TmdbClient,
  context: string,
  options: { tmdbId?: number; title?: string }
): Promise<
  | { success: true; tv: ResolvedTv }
  | { success: false; error: ReturnType<typeof createErrorResponse> }
> => {
  const { tmdbId, title } = options;

  // If tmdbId is provided, fetch details to get the name
  if (tmdbId) {
    const details = await tmdbClient.getTvDetails(tmdbId);
    return { success: true, tv: { id: details.id, name: details.name } };
  }

  // If title is provided, search for it
  if (title) {
    const searchResult = await tmdbClient.searchTv(title);
    const firstResult = searchResult.results[0];
    if (!firstResult) {
      return {
        success: false,
        error: createErrorResponse(
          context,
          new Error(`No TV series found matching title: ${title}`)
        ),
      };
    }
    return {
      success: true,
      tv: { id: firstResult.id, name: firstResult.name },
    };
  }

  return {
    success: false,
    error: createErrorResponse(
      context,
      new Error("Could not determine TV series ID")
    ),
  };
};
