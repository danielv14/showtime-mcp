import { describe, it, expect } from "bun:test";
import { getSimilarTool } from "../get-similar.js";
import { getReviewsTool } from "../get-reviews.js";
import { getWhereToWatchTool } from "../get-where-to-watch.js";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";
import { ToolResponseError, type ToolClients } from "../define-tool.js";
import type {
  TmdbSearchResponse,
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
} from "../../tmdb-api/types.js";

const tmdb = (overrides: Parameters<typeof createFakeTmdbClient>[0]): ToolClients => ({
  tmdb: createFakeTmdbClient(overrides),
  omdb: createFakeOmdbClient(),
});

const moviePage = (): TmdbSearchResponse<TmdbMovieSearchResult> => ({
  page: 1,
  total_pages: 1,
  total_results: 1,
  results: [
    { id: 9, title: "Similar Movie", release_date: "2011-01-01", overview: "", vote_average: 7, vote_count: 5, poster_path: null } as TmdbMovieSearchResult,
  ],
});

const tvPage = (): TmdbSearchResponse<TmdbTvSearchResult> => ({
  page: 1,
  total_pages: 1,
  total_results: 1,
  results: [
    { id: 8, name: "Similar Show", first_air_date: "2012-01-01", overview: "", vote_average: 8, vote_count: 6, poster_path: null } as TmdbTvSearchResult,
  ],
});

const paginated = (result: unknown) =>
  result as { data: Record<string, unknown> };

describe("get_similar", () => {
  it("returns the movie branch with the source movie's genres", async () => {
    const result = paginated(
      await getSimilarTool.handler(
        { movieId: 1 },
        tmdb({
          getSimilarMovies: async () => moviePage(),
          getMovieDetails: async () => ({ id: 1, title: "Source", genres: [{ id: 1, name: "Drama" }] }) as never,
        })
      )
    );
    expect(result.data.mediaType).toBe("movie");
    expect(result.data.basedOn).toEqual({ tmdbId: 1, title: "Source", genres: ["Drama"] });
  });

  it("returns the tv branch with the source show's genres", async () => {
    const result = paginated(
      await getSimilarTool.handler(
        { tvId: 2 },
        tmdb({
          getSimilarTv: async () => tvPage(),
          getTvDetails: async () => ({ id: 2, name: "Source Show", genres: [{ id: 2, name: "Crime" }] }) as never,
        })
      )
    );
    expect(result.data.mediaType).toBe("tv");
    expect(result.data.basedOn).toEqual({ tmdbId: 2, name: "Source Show", genres: ["Crime"] });
  });

  it("throws the guard error when neither id is given", async () => {
    await expect(getSimilarTool.handler({}, tmdb({}))).rejects.toBeInstanceOf(
      ToolResponseError
    );
  });
});

describe("get_reviews", () => {
  it("returns formatted reviews for the movie branch", async () => {
    const result = (await getReviewsTool.handler(
      { movieId: 1 },
      tmdb({
        getMovieDetails: async () => ({ title: "M" }) as never,
        getMovieReviews: async () =>
          ({
            page: 1,
            total_pages: 1,
            total_results: 1,
            results: [
              { id: "r1", author: "a", author_details: { username: "u", rating: 9 }, content: "good", created_at: "2020", url: "http://x" },
            ],
          }) as never,
      })
    )) as { mediaType: string; mediaTitle: string; totalReviews: number; reviews: unknown[] };
    expect(result.mediaType).toBe("movie");
    expect(result.mediaTitle).toBe("M");
    expect(result.totalReviews).toBe(1);
    expect(result.reviews.length).toBe(1);
  });

  it("throws the guard error when neither id is given", async () => {
    await expect(getReviewsTool.handler({}, tmdb({}))).rejects.toBeInstanceOf(
      ToolResponseError
    );
  });
});

describe("get_where_to_watch", () => {
  it("resolves a movie by tmdbId and formats provider lists for the region", async () => {
    const result = (await getWhereToWatchTool.handler(
      { tmdbId: 1, region: "se" },
      tmdb({
        getMovieDetails: async () => ({ id: 1, title: "Movie" }) as never,
        getWatchProviders: async () =>
          ({
            results: {
              SE: {
                link: "http://jw",
                flatrate: [{ provider_name: "Netflix", logo_path: "/n.jpg" }],
              },
            },
          }) as never,
      })
    )) as { region: string; streaming: Array<{ name: string; logoUrl: string | null }> };
    expect(result.region).toBe("SE");
    expect(result.streaming).toEqual([
      { name: "Netflix", logoUrl: "https://image.tmdb.org/t/p/w92/n.jpg" },
    ]);
  });

  it("reports no options when the region is absent", async () => {
    const result = (await getWhereToWatchTool.handler(
      { tmdbId: 1, region: "JP" },
      tmdb({
        getMovieDetails: async () => ({ id: 1, title: "Movie" }) as never,
        getWatchProviders: async () => ({ results: { US: { link: "x" } } }) as never,
      })
    )) as { message?: string; availableRegions?: string[] };
    expect(result.message).toMatch(/No streaming/);
    expect(result.availableRegions).toEqual(["US"]);
  });

  it("rejects an IMDb-only lookup for a TV series", async () => {
    await expect(
      getWhereToWatchTool.handler({ mediaType: "tv", imdbId: "tt1" }, tmdb({}))
    ).rejects.toThrow(/only supported for movies/);
  });

  it("throws the guard error when no identifier is given", async () => {
    await expect(getWhereToWatchTool.handler({}, tmdb({}))).rejects.toBeInstanceOf(
      ToolResponseError
    );
  });
});
