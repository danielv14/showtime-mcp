// TMDB API Response Types

// Configuration
export interface TmdbConfiguration {
  images: {
    base_url: string;
    secure_base_url: string;
    poster_sizes: string[];
    backdrop_sizes: string[];
    profile_sizes: string[];
  };
}

// Search Results
export interface TmdbMovieSearchResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
}

export interface TmdbSearchResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Person
export interface TmdbPersonSearchResult {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
  known_for: TmdbMovieSearchResult[];
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  imdb_id: string | null;
  known_for_department: string;
}

// Credits
export interface TmdbMovieCredit {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  character?: string; // For cast
  job?: string; // For crew
  department?: string; // For crew
  credit_id: string;
}

export interface TmdbPersonMovieCredits {
  id: number;
  cast: TmdbMovieCredit[];
  crew: TmdbMovieCredit[];
}

// Movie Details
export interface TmdbMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  release_date: string;
  runtime: number | null;
  budget: number;
  revenue: number;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; name: string }[];
  status: string;
}

// Cast & Crew
export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  id: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

// Watch Providers
export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbWatchProviderRegion {
  link: string;
  flatrate?: TmdbWatchProvider[]; // Subscription streaming
  rent?: TmdbWatchProvider[]; // Rent
  buy?: TmdbWatchProvider[]; // Buy
  free?: TmdbWatchProvider[]; // Free with ads
}

export interface TmdbWatchProviders {
  id: number;
  results: Record<string, TmdbWatchProviderRegion>; // Keyed by country code (US, GB, etc.)
}

// Discover Filters
export interface DiscoverMoviesOptions {
  page?: number;
  sort_by?:
    | "popularity.desc"
    | "popularity.asc"
    | "release_date.desc"
    | "release_date.asc"
    | "vote_average.desc"
    | "vote_average.asc"
    | "revenue.desc"
    | "revenue.asc";
  year?: number;
  primary_release_year?: number;
  with_genres?: string; // Comma-separated genre IDs
  without_genres?: string;
  with_people?: string; // Comma-separated person IDs (AND), pipe-separated (OR)
  with_crew?: string; // Comma-separated person IDs
  with_cast?: string; // Comma-separated person IDs
  vote_average_gte?: number;
  vote_average_lte?: number;
  vote_count_gte?: number;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  with_original_language?: string; // ISO 639-1 code
}

// Genre reference
export interface TmdbGenre {
  id: number;
  name: string;
}

// Find by external ID response
export interface TmdbFindResponse {
  movie_results: TmdbMovieDetails[];
  person_results: TmdbPersonDetails[];
  tv_results: unknown[];
  tv_episode_results: unknown[];
  tv_season_results: unknown[];
}

// Error response
export interface TmdbErrorResponse {
  success: false;
  status_code: number;
  status_message: string;
}
