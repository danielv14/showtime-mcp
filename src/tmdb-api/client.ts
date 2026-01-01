import ky, { type KyInstance } from "ky";
import type {
  TmdbSearchResponse,
  TmdbMovieSearchResult,
  TmdbPersonSearchResult,
  TmdbPersonDetails,
  TmdbPersonMovieCredits,
  TmdbMovieDetails,
  TmdbCredits,
  TmdbWatchProviders,
  TmdbGenre,
  TmdbFindResponse,
  DiscoverMoviesOptions,
} from "./types.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export class TmdbApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "TmdbApiError";
  }
}

export const createTmdbClient = (apiKey: string) => {
  const kyClient: KyInstance = ky.create({
    prefixUrl: TMDB_BASE_URL,
    timeout: 30000,
    retry: {
      limit: 2,
      statusCodes: [408, 429, 500, 502, 503, 504],
    },
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  // Helper to build full image URLs
  const getImageUrl = (
    path: string | null,
    size: string = "w500"
  ): string | null => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  };

  // Search movies
  const searchMovies = async (
    query: string,
    options?: { page?: number; year?: number }
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    const searchParams: Record<string, string | number> = { query };
    if (options?.page) searchParams.page = options.page;
    if (options?.year) searchParams.year = options.year;

    return kyClient
      .get("search/movie", { searchParams })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  // Search people (actors, directors, etc.)
  const searchPerson = async (
    query: string,
    options?: { page?: number }
  ): Promise<TmdbSearchResponse<TmdbPersonSearchResult>> => {
    const searchParams: Record<string, string | number> = { query };
    if (options?.page) searchParams.page = options.page;

    return kyClient
      .get("search/person", { searchParams })
      .json<TmdbSearchResponse<TmdbPersonSearchResult>>();
  };

  // Get person details
  const getPersonDetails = async (
    personId: number
  ): Promise<TmdbPersonDetails> => {
    return kyClient.get(`person/${personId}`).json<TmdbPersonDetails>();
  };

  // Get person's movie credits (filmography)
  const getPersonMovieCredits = async (
    personId: number
  ): Promise<TmdbPersonMovieCredits> => {
    return kyClient
      .get(`person/${personId}/movie_credits`)
      .json<TmdbPersonMovieCredits>();
  };

  // Get movie details
  const getMovieDetails = async (movieId: number): Promise<TmdbMovieDetails> => {
    return kyClient.get(`movie/${movieId}`).json<TmdbMovieDetails>();
  };

  // Get movie details by IMDB ID
  const getMovieByImdbId = async (
    imdbId: string
  ): Promise<TmdbMovieDetails | null> => {
    const response = await kyClient
      .get(`find/${imdbId}`, {
        searchParams: { external_source: "imdb_id" },
      })
      .json<TmdbFindResponse>();

    const firstResult = response.movie_results[0];
    if (!firstResult) {
      return null;
    }
    // The find endpoint returns partial data, so we fetch full details
    return getMovieDetails(firstResult.id);
  };

  // Get movie credits (cast & crew)
  const getMovieCredits = async (movieId: number): Promise<TmdbCredits> => {
    return kyClient.get(`movie/${movieId}/credits`).json<TmdbCredits>();
  };

  // Get watch providers for a movie
  const getWatchProviders = async (
    movieId: number
  ): Promise<TmdbWatchProviders> => {
    return kyClient
      .get(`movie/${movieId}/watch/providers`)
      .json<TmdbWatchProviders>();
  };

  // Discover movies with filters
  const discoverMovies = async (
    options: DiscoverMoviesOptions
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    const paramMapping: Record<string, string | number | undefined> = {
      page: options.page,
      sort_by: options.sort_by,
      year: options.year,
      primary_release_year: options.primary_release_year,
      with_genres: options.with_genres,
      without_genres: options.without_genres,
      with_people: options.with_people,
      with_crew: options.with_crew,
      with_cast: options.with_cast,
      "vote_average.gte": options.vote_average_gte,
      "vote_average.lte": options.vote_average_lte,
      "vote_count.gte": options.vote_count_gte,
      "with_runtime.gte": options.with_runtime_gte,
      "with_runtime.lte": options.with_runtime_lte,
      with_original_language: options.with_original_language,
    };

    const searchParams = Object.fromEntries(
      Object.entries(paramMapping).filter(([_, v]) => v !== undefined)
    ) as Record<string, string | number>;

    return kyClient
      .get("discover/movie", { searchParams })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  // Get genre list (useful for discover)
  const getMovieGenres = async (): Promise<TmdbGenre[]> => {
    return kyClient
      .get("genre/movie/list")
      .json<{ genres: TmdbGenre[] }>()
      .then((response) => response.genres);
  };

  return {
    searchMovies,
    searchPerson,
    getPersonDetails,
    getPersonMovieCredits,
    getMovieDetails,
    getMovieByImdbId,
    getMovieCredits,
    getWatchProviders,
    discoverMovies,
    getMovieGenres,
    getImageUrl,
  };
};

export type TmdbClient = ReturnType<typeof createTmdbClient>;
