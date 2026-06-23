import { describe, it, expect } from "bun:test";
import { searchMoviesTool } from "../search-movies.js";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";
import type { ToolClients } from "../define-tool.js";
import type {
  TmdbSearchResponse,
  TmdbMovieSearchResult,
} from "../../tmdb-api/types.js";

const movie = (
  overrides: Partial<TmdbMovieSearchResult> = {}
): TmdbMovieSearchResult =>
  ({
    id: 27205,
    title: "Inception",
    release_date: "2010-07-15",
    overview: "A thief who steals corporate secrets.",
    vote_average: 8.4,
    vote_count: 34000,
    poster_path: "/poster.jpg",
    ...overrides,
  }) as TmdbMovieSearchResult;

const searchResponse = (
  results: TmdbMovieSearchResult[]
): TmdbSearchResponse<TmdbMovieSearchResult> => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
});

describe("search_movies handler", () => {
  it("formats results and includes pagination metadata", async () => {
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient({
        searchMovies: async () => searchResponse([movie()]),
      }),
      omdb: createFakeOmdbClient(),
    };

    const result = (await searchMoviesTool.handler(
      { query: "inception" },
      clients
    )) as { apiResponse: unknown; data: { results: unknown[] } };

    expect(result.data.results).toEqual([
      {
        tmdbId: 27205,
        title: "Inception",
        year: "2010",
        releaseDate: "2010-07-15",
        overview: "A thief who steals corporate secrets.",
        tmdbRating: 8.4,
        posterUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
      },
    ]);
    expect(result.apiResponse).toEqual({
      page: 1,
      results: [movie()],
      total_pages: 1,
      total_results: 1,
    });
  });

  it("forwards the query, page and year to the client", async () => {
    let receivedArgs: unknown;
    const clients: ToolClients = {
      tmdb: createFakeTmdbClient({
        searchMovies: async (query, options) => {
          receivedArgs = { query, options };
          return searchResponse([]);
        },
      }),
      omdb: createFakeOmdbClient(),
    };

    await searchMoviesTool.handler(
      { query: "dune", page: 2, year: 2021 },
      clients
    );

    expect(receivedArgs).toEqual({
      query: "dune",
      options: { page: 2, year: 2021 },
    });
  });
});
