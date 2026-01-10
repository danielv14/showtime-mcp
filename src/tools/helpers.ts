import type {
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
} from "../tmdb-api/types.js";
import type { TmdbClient } from "../tmdb-api/client.js";
import type { OmdbSeasonEpisode } from "../omdb-api/types.js";

/** TMDB caps pagination at 500 pages regardless of total_pages returned */
export const TMDB_MAX_PAGES = 500;

/** Cap total pages to TMDB's maximum allowed value */
export const capTotalPages = (totalPages: number): number =>
  Math.min(totalPages, TMDB_MAX_PAGES);

export const createSuccessResponse = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export const createErrorResponse = (context: string, error: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: `Error ${context}: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
    },
  ],
  isError: true,
});

export const truncateText = (text: string, maxLength: number): string =>
  text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

export const extractYear = (releaseDate: string | undefined | null): string =>
  releaseDate?.split("-")[0] || "N/A";

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

export const formatOmdbEpisode = (episode: OmdbSeasonEpisode) => ({
  title: episode.Title,
  episode: episode.Episode,
  released: episode.Released,
  imdbRating: episode.imdbRating,
  imdbId: episode.imdbID,
});

export const formatTmdbMovieResult = (
  movie: TmdbMovieSearchResult,
  getImageUrl: (path: string | null, size?: string) => string | null,
  options?: { includeVoteCount?: boolean }
) => ({
  tmdbId: movie.id,
  title: movie.title,
  year: extractYear(movie.release_date),
  releaseDate: movie.release_date || "N/A",
  overview: truncateText(movie.overview || "", 200),
  tmdbRating: movie.vote_average,
  ...(options?.includeVoteCount && { voteCount: movie.vote_count }),
  posterUrl: getImageUrl(movie.poster_path, "w342"),
});

export const formatTmdbTvResult = (
  show: TmdbTvSearchResult,
  getImageUrl: (path: string | null, size?: string) => string | null,
  options?: { includeVoteCount?: boolean }
) => ({
  tmdbId: show.id,
  name: show.name,
  year: extractYear(show.first_air_date),
  firstAirDate: show.first_air_date || "N/A",
  overview: truncateText(show.overview || "", 200),
  tmdbRating: show.vote_average,
  ...(options?.includeVoteCount && { voteCount: show.vote_count }),
  posterUrl: getImageUrl(show.poster_path, "w342"),
});

export const MOVIE_GENRE_MAP: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  "sci-fi": 878,
  "tv movie": 10770,
  thriller: 53,
  war: 10752,
  western: 37,
};

export const TV_GENRE_MAP: Record<string, number> = {
  "action & adventure": 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  kids: 10762,
  mystery: 9648,
  news: 10763,
  reality: 10764,
  "sci-fi & fantasy": 10765,
  "sci-fi": 10765,
  soap: 10766,
  talk: 10767,
  "war & politics": 10768,
  western: 37,
};

export const getGenreId = (
  genreName: string,
  genreMap: Record<string, number>
): number | null => {
  const normalizedGenre = genreName.toLowerCase().trim();
  return genreMap[normalizedGenre] || null;
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
