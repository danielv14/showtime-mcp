import { describe, it, expect } from "bun:test";
import { createFakeTmdbClient } from "./fakes.js";
import { ToolResponseError, type ToolClients } from "../define-tool.js";
import { createFakeOmdbClient } from "./fakes.js";
import { searchPersonTool } from "../search-person.js";
import { discoverMoviesTool } from "../discover-movies.js";
import { discoverTvTool } from "../discover-tv.js";
import { getTrendingTool } from "../get-trending.js";
import { getMovieRecommendationsTool } from "../get-recommendations.js";
import { getTvRecommendationsTool } from "../get-tv-recommendations.js";
import { getCollectionTool } from "../get-collection.js";
import { getVideosTool } from "../get-videos.js";
import { getNowPlayingTool } from "../get-now-playing.js";
import { getUpcomingTool } from "../get-upcoming.js";
import { getAiringTodayTool } from "../get-airing-today.js";
import { getPersonDetailsTool } from "../get-person-details.js";
import { multiSearchTool } from "../multi-search.js";
import type {
  TmdbSearchResponse,
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
} from "../../tmdb-api/types.js";

const clientsWith = (tmdb: Partial<Parameters<typeof createFakeTmdbClient>[0]>): ToolClients => ({
  tmdb: createFakeTmdbClient(tmdb),
  omdb: createFakeOmdbClient(),
});

const page = <T>(results: T[]): TmdbSearchResponse<T> => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
});

const movie = (
  overrides: Partial<TmdbMovieSearchResult> = {}
): TmdbMovieSearchResult =>
  ({
    id: 1,
    title: "A Movie",
    release_date: "2020-01-02",
    overview: "x",
    vote_average: 7,
    vote_count: 100,
    poster_path: "/m.jpg",
    ...overrides,
  }) as TmdbMovieSearchResult;

const tv = (overrides: Partial<TmdbTvSearchResult> = {}): TmdbTvSearchResult =>
  ({
    id: 2,
    name: "A Show",
    first_air_date: "2019-05-06",
    overview: "y",
    vote_average: 8,
    vote_count: 200,
    poster_path: "/t.jpg",
    ...overrides,
  }) as TmdbTvSearchResult;

// Paginated handlers return a branded paginatedResult; read its data/apiResponse.
const paginated = (result: unknown) =>
  result as { apiResponse: unknown; data: Record<string, unknown> };

describe("search_person", () => {
  it("formats people with their top known-for titles", async () => {
    const result = paginated(
      await searchPersonTool.handler(
        { query: "nolan" },
        clientsWith({
          searchPerson: async () =>
            page([
              {
                id: 525,
                name: "Christopher Nolan",
                known_for_department: "Directing",
                profile_path: "/n.jpg",
                known_for: [movie({ id: 27205, title: "Inception" })],
              },
            ] as never),
        })
      )
    );
    expect(result.data.results).toEqual([
      {
        tmdbId: 525,
        name: "Christopher Nolan",
        knownForDepartment: "Directing",
        profileImageUrl: "https://image.tmdb.org/t/p/w185/n.jpg",
        knownFor: [{ title: "Inception", year: "2020", tmdbId: 27205 }],
      },
    ]);
  });
});

describe("discover_movies", () => {
  it("maps a genre name to its id and forwards filters", async () => {
    let forwarded: unknown;
    const result = paginated(
      await discoverMoviesTool.handler(
        { genre: "action", minRating: 7, page: 1 },
        clientsWith({
          discoverMovies: async (options) => {
            forwarded = options;
            return page([movie()]);
          },
        })
      )
    );
    expect((forwarded as { with_genres?: string }).with_genres).toBe("28");
    expect((forwarded as { vote_count_gte?: number }).vote_count_gte).toBe(50);
    expect((result.data.results as unknown[]).length).toBe(1);
  });

  it("throws on an unknown genre", async () => {
    await expect(
      discoverMoviesTool.handler({ genre: "nope" }, clientsWith({}))
    ).rejects.toThrow(/Unknown genre 'nope'/);
  });
});

describe("discover_tv", () => {
  it("maps a genre name to its id and forwards filters", async () => {
    let forwarded: unknown;
    const result = paginated(
      await discoverTvTool.handler(
        { genre: "drama", minRating: 8, page: 1 },
        clientsWith({
          discoverTv: async (options) => {
            forwarded = options;
            return page([tv()]);
          },
        })
      )
    );
    expect((forwarded as { with_genres?: string }).with_genres).toBe("18");
    expect((forwarded as { vote_count_gte?: number }).vote_count_gte).toBe(50);
    expect((result.data.results as unknown[]).length).toBe(1);
  });

  it("throws on an unknown genre", async () => {
    await expect(
      discoverTvTool.handler({ genre: "nope" }, clientsWith({}))
    ).rejects.toThrow(/Unknown genre 'nope'/);
  });
});

describe("get_trending", () => {
  it("formats a mix of movie and tv results", async () => {
    const result = paginated(
      await getTrendingTool.handler(
        {},
        clientsWith({
          getTrending: async () =>
            page([
              { id: 1, media_type: "movie", title: "M", release_date: "2021-03-04", overview: "", poster_path: null, vote_average: 5, vote_count: 1, genre_ids: [] },
              { id: 2, media_type: "tv", name: "S", first_air_date: "2018-07-08", overview: "", poster_path: null, vote_average: 6, vote_count: 2, genre_ids: [] },
            ] as never),
        })
      )
    );
    const results = result.data.results as Array<{ title: string; mediaType: string; year: string }>;
    expect(results[0]).toMatchObject({ title: "M", mediaType: "movie", year: "2021" });
    expect(results[1]).toMatchObject({ title: "S", mediaType: "tv", year: "2018" });
  });
});

describe("get_movie_recommendations", () => {
  it("resolves the source movie by tmdbId and returns recommendations", async () => {
    const result = paginated(
      await getMovieRecommendationsTool.handler(
        { tmdbId: 27205 },
        clientsWith({
          getMovieDetails: async () => ({ id: 27205, title: "Inception" }) as never,
          getMovieRecommendations: async () => page([movie({ id: 99, title: "Rec" })]),
        })
      )
    );
    expect(result.data.sourceMovie).toEqual({ tmdbId: 27205, title: "Inception" });
    expect((result.data.recommendations as unknown[]).length).toBe(1);
  });

  it("throws the guard error when no identifier is given", async () => {
    await expect(
      getMovieRecommendationsTool.handler({}, clientsWith({}))
    ).rejects.toBeInstanceOf(ToolResponseError);
  });
});

describe("get_tv_recommendations", () => {
  it("resolves the source show by tmdbId", async () => {
    const result = paginated(
      await getTvRecommendationsTool.handler(
        { tmdbId: 5 },
        clientsWith({
          getTvDetails: async () => ({ id: 5, name: "Severance" }) as never,
          getTvRecommendations: async () => page([tv({ id: 6, name: "Rec" })]),
        })
      )
    );
    expect(result.data.sourceShow).toEqual({ tmdbId: 5, title: "Severance" });
  });

  it("throws the guard error when no identifier is given", async () => {
    await expect(
      getTvRecommendationsTool.handler({}, clientsWith({}))
    ).rejects.toBeInstanceOf(ToolResponseError);
  });
});

describe("get_collection", () => {
  it("returns movies ordered by release date when given a collectionId", async () => {
    const result = (await getCollectionTool.handler(
      { collectionId: 10 },
      clientsWith({
        getCollection: async () =>
          ({
            id: 10,
            name: "Saga",
            overview: "o",
            poster_path: "/p.jpg",
            backdrop_path: "/b.jpg",
            parts: [
              movie({ id: 2, title: "Second", release_date: "2005-01-01" }),
              movie({ id: 1, title: "First", release_date: "2000-01-01" }),
            ],
          }) as never,
      })
    )) as { movies: Array<{ order: number; title: string }> };
    expect(result.movies.map((m) => m.title)).toEqual(["First", "Second"]);
    expect(result.movies[0]!.order).toBe(1);
  });

  it("throws when the resolved movie is not part of a collection", async () => {
    await expect(
      getCollectionTool.handler(
        { movieTmdbId: 1 },
        clientsWith({
          getMovieDetails: async () =>
            ({ id: 1, title: "Lonely", belongs_to_collection: null }) as never,
        })
      )
    ).rejects.toThrow(/is not part of a collection/);
  });
});

describe("get_videos", () => {
  it("sorts official videos first and filters by type", async () => {
    const result = (await getVideosTool.handler(
      { movieId: 1, type: "Trailer" },
      clientsWith({
        getMovieDetails: async () => ({ title: "M" }) as never,
        getMovieVideos: async () =>
          ({
            id: 1,
            results: [
              { id: "a", key: "k1", name: "Unofficial", site: "YouTube", size: 1080, type: "Trailer", official: false, published_at: "2020-01-01", iso_639_1: "en", iso_3166_1: "US" },
              { id: "b", key: "k2", name: "Official", site: "YouTube", size: 1080, type: "Trailer", official: true, published_at: "2019-01-01", iso_639_1: "en", iso_3166_1: "US" },
              { id: "c", key: "k3", name: "A clip", site: "YouTube", size: 1080, type: "Clip", official: true, published_at: "2021-01-01", iso_639_1: "en", iso_3166_1: "US" },
            ],
          }) as never,
      })
    )) as { videos: Array<{ name: string }>; totalVideos: number };
    expect(result.videos.map((v) => v.name)).toEqual(["Official", "Unofficial"]);
    expect(result.totalVideos).toBe(2);
  });

  it("throws the guard error when neither movieId nor tvId is given", async () => {
    await expect(getVideosTool.handler({}, clientsWith({}))).rejects.toBeInstanceOf(
      ToolResponseError
    );
  });
});

describe("get_now_playing / get_upcoming / get_airing_today", () => {
  it("get_now_playing forwards the region and paginates", async () => {
    const result = paginated(
      await getNowPlayingTool.handler(
        { region: "SE" },
        clientsWith({ getNowPlayingMovies: async () => page([movie()]) })
      )
    );
    expect(result.data.region).toBe("SE");
  });

  it("get_upcoming defaults the region to US", async () => {
    const result = paginated(
      await getUpcomingTool.handler(
        {},
        clientsWith({ getUpcomingMovies: async () => page([movie()]) })
      )
    );
    expect(result.data.region).toBe("US");
  });

  it("get_airing_today returns formatted shows", async () => {
    const result = paginated(
      await getAiringTodayTool.handler(
        {},
        clientsWith({ getAiringTodayTv: async () => page([tv()]) })
      )
    );
    expect((result.data.results as unknown[]).length).toBe(1);
  });
});

describe("get_person_details", () => {
  it("formats a person's details", async () => {
    const result = (await getPersonDetailsTool.handler(
      { personId: 1 },
      clientsWith({
        getPersonDetails: async () =>
          ({
            id: 1,
            name: "Actor",
            known_for_department: "Acting",
            biography: "",
            birthday: "1970-01-01",
            deathday: null,
            place_of_birth: "Earth",
            imdb_id: "nm1",
            profile_path: "/p.jpg",
          }) as never,
      })
    )) as { biography: string; profileImageUrl: string | null };
    expect(result.biography).toBe("No biography available.");
    expect(result.profileImageUrl).toBe("https://image.tmdb.org/t/p/w500/p.jpg");
  });
});

describe("multi_search", () => {
  it("groups results by media type", async () => {
    const result = paginated(
      await multiSearchTool.handler(
        { query: "x" },
        clientsWith({
          multiSearch: async () =>
            page([
              { id: 1, media_type: "movie", title: "M", release_date: "2020-01-01", overview: "", vote_average: 5, poster_path: null },
              { id: 2, media_type: "person", name: "P", known_for_department: "Acting", profile_path: null, known_for: [] },
            ] as never),
        })
      )
    );
    const byType = result.data.byType as { movies?: unknown[]; people?: unknown[]; tvShows?: unknown[] };
    expect(byType.movies?.length).toBe(1);
    expect(byType.people?.length).toBe(1);
    expect(byType.tvShows).toBeUndefined();
  });
});
