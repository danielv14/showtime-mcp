import { describe, it, expect } from "bun:test";
import { getMovieTool } from "../get-movie.js";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";
import type { ToolClients } from "../define-tool.js";
import type { TmdbMovieDetails, TmdbCredits } from "../../tmdb-api/types.js";
import type { OmdbMovieDetails } from "../../omdb-api/types.js";

const tmdbDetails = (
  overrides: Partial<TmdbMovieDetails> = {}
): TmdbMovieDetails =>
  ({
    id: 27205,
    imdb_id: "tt1375666",
    title: "Inception",
    overview: "tmdb overview",
    tagline: "Your mind is the scene of the crime.",
    budget: 160000000,
    revenue: 800000000,
    poster_path: "/tmdb-poster.jpg",
    backdrop_path: "/backdrop.jpg",
    vote_average: 8.4,
    vote_count: 34000,
    genres: [{ id: 1, name: "Science Fiction" }],
    production_companies: [{ id: 1, name: "Warner Bros.", logo_path: null }],
    ...overrides,
  }) as TmdbMovieDetails;

const omdbMovie = (
  overrides: Partial<OmdbMovieDetails> = {}
): OmdbMovieDetails =>
  ({
    Type: "movie",
    Title: "Inception",
    Year: "2010",
    imdbID: "tt1375666",
    imdbRating: "8.8",
    imdbVotes: "2,000,000",
    Metascore: "74",
    Ratings: [{ Source: "Internet Movie Database", Value: "8.8/10" }],
    BoxOffice: "$292,000,000",
    Awards: "Won 4 Oscars",
    Director: "Christopher Nolan",
    Writer: "Christopher Nolan",
    Actors: "Leonardo DiCaprio",
    Poster: "https://omdb/poster.jpg",
    Rated: "PG-13",
    Released: "16 Jul 2010",
    Runtime: "148 min",
    Genre: "Action, Sci-Fi",
    Plot: "omdb plot",
    Language: "English",
    Country: "USA",
    ...overrides,
  }) as OmdbMovieDetails;

const credits = (): TmdbCredits =>
  ({
    id: 27205,
    cast: [
      { id: 10, name: "Leonardo DiCaprio", character: "Cobb", profile_path: "/leo.jpg", order: 0 },
    ],
    crew: [
      { id: 1, name: "Christopher Nolan", job: "Director", department: "Directing", profile_path: null },
      { id: 1, name: "Christopher Nolan", job: "Screenplay", department: "Writing", profile_path: null },
      { id: 1, name: "Christopher Nolan", job: "Writer", department: "Writing", profile_path: null },
      { id: 2, name: "Hans Zimmer", job: "Original Music Composer", department: "Sound", profile_path: null },
      { id: 3, name: "Wally Pfister", job: "Director of Photography", department: "Camera", profile_path: null },
    ],
  }) as TmdbCredits;

describe("get_movie id resolution", () => {
  it("resolves via tmdbId, preferring TMDB images and merging OMDB ratings", async () => {
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient({
        getMovieDetails: async () => tmdbDetails(),
        getMovieCredits: async () => credits(),
      }),
      omdb: createFakeOmdbClient({ getById: async () => omdbMovie() }),
    };

    const output = (await getMovieTool.handler(
      { tmdbId: 27205 },
      clients
    )) as Record<string, unknown>;

    expect(output.tmdbId).toBe(27205);
    expect(output.imdbId).toBe("tt1375666");
    // image precedence: TMDB poster wins when tmdbDetails is present
    expect(output.posterUrl).toBe("https://image.tmdb.org/t/p/w500/tmdb-poster.jpg");
    expect(output.imdbRating).toBe("8.8");
    expect(output.tmdbRating).toBe(8.4);
  });

  it("resolves via imdbId and falls back to the OMDB poster when TMDB has no match", async () => {
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient({
        getMovieByImdbId: async () => null,
      }),
      omdb: createFakeOmdbClient({ getById: async () => omdbMovie() }),
    };

    const output = (await getMovieTool.handler(
      { imdbId: "tt1375666" },
      clients
    )) as Record<string, unknown>;

    expect(output.tmdbId).toBeUndefined();
    expect(output.posterUrl).toBe("https://omdb/poster.jpg");
    expect(output.crew).toBeUndefined();
  });

  it("resolves via title through TMDB search", async () => {
    let searched = "";
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient({
        searchMovies: async (query) => {
          searched = query;
          return { page: 1, results: [tmdbDetails()], total_pages: 1, total_results: 1 } as never;
        },
        getMovieDetails: async () => tmdbDetails(),
        getMovieCredits: async () => credits(),
      }),
      omdb: createFakeOmdbClient({ getById: async () => omdbMovie() }),
    };

    const output = (await getMovieTool.handler(
      { title: "Inception" },
      clients
    )) as Record<string, unknown>;

    expect(searched).toBe("Inception");
    expect(output.title).toBe("Inception");
    // proves the search result id flowed into TMDB detail resolution
    expect(output.tmdbId).toBe(27205);
  });

  it("throws when OMDB resolves the id to a non-movie", async () => {
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient(),
      omdb: createFakeOmdbClient({
        getById: async () => ({ Type: "series", imdbID: "tt1" }) as never,
      }),
    };

    await expect(
      getMovieTool.handler({ imdbId: "tt0903747" }, clients)
    ).rejects.toThrow(/not a movie/);
  });
});

describe("get_movie crew filtering", () => {
  it("groups crew by job and de-duplicates writers by person id", async () => {
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient({
        getMovieDetails: async () => tmdbDetails(),
        getMovieCredits: async () => credits(),
      }),
      omdb: createFakeOmdbClient({ getById: async () => omdbMovie() }),
    };

    const output = (await getMovieTool.handler({ tmdbId: 27205 }, clients)) as {
      crew: {
        directors: Array<{ name: string }>;
        writers: Array<{ name: string }>;
        composers: Array<{ name: string }>;
        cinematographers: Array<{ name: string }>;
      };
    };

    expect(output.crew.directors).toEqual([
      { name: "Christopher Nolan", tmdbId: 1 } as never,
    ]);
    // Nolan appears as Screenplay, Writer and Writing-dept but is de-duped to one entry.
    expect(output.crew.writers.filter((w) => w.name === "Christopher Nolan")).toHaveLength(1);
    expect(output.crew.composers[0]!.name).toBe("Hans Zimmer");
    expect(output.crew.cinematographers[0]!.name).toBe("Wally Pfister");
  });

  it("omits credits when includeCredits is false", async () => {
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient({ getMovieDetails: async () => tmdbDetails() }),
      omdb: createFakeOmdbClient({ getById: async () => omdbMovie() }),
    };

    const output = (await getMovieTool.handler(
      { tmdbId: 27205, includeCredits: false },
      clients
    )) as Record<string, unknown>;

    expect(output.cast).toBeUndefined();
    expect(output.crew).toBeUndefined();
  });
});
