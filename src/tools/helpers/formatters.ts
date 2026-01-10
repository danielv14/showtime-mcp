import type {
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
} from "../../tmdb-api/types.js";
import type { OmdbSeasonEpisode } from "../../omdb-api/types.js";

export const truncateText = (text: string, maxLength: number): string =>
  text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

export const extractYear = (releaseDate: string | undefined | null): string =>
  releaseDate?.split("-")[0] || "N/A";

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
