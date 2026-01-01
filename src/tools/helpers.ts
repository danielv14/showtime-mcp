import type { TmdbMovieSearchResult } from "../tmdb-api/types.js";
import type { OmdbSeasonEpisode } from "../omdb-api/types.js";

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
