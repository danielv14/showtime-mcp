import { describe, it, expect } from "bun:test";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";
import { ToolResponseError, type ToolClients } from "../define-tool.js";
import { searchSeriesTool } from "../search-series.js";
import { getSeriesTool } from "../get-series.js";
import { getEpisodeTool } from "../get-episode.js";
import { getSeasonTool } from "../get-season.js";
import { getAllEpisodesTool } from "../get-all-episodes.js";

const clientsWith = (
  omdb: Partial<Parameters<typeof createFakeOmdbClient>[0]>
): ToolClients => ({
  tmdb: createFakeTmdbClient(),
  omdb: createFakeOmdbClient(omdb),
});

describe("search_series", () => {
  it("computes OMDB-style pagination (10 results per page)", async () => {
    const result = (await searchSeriesTool.handler(
      { query: "lost" },
      clientsWith({
        searchSeries: async () =>
          ({
            Search: [{ Title: "Lost", Year: "2004", imdbID: "tt0411008", Type: "series" }],
            totalResults: "25",
            Response: "True",
          }) as never,
      })
    )) as { totalResults: number; page: number; totalPages: number; results: unknown[] };
    expect(result.totalResults).toBe(25);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.results.length).toBe(1);
  });
});

describe("get_series", () => {
  it("returns series details for an imdbId", async () => {
    const result = (await getSeriesTool.handler(
      { imdbId: "tt0903747" },
      clientsWith({
        getById: async () =>
          ({ Type: "series", Title: "Breaking Bad", imdbID: "tt0903747", totalSeasons: "5" }) as never,
      })
    )) as { title: string; totalSeasons: string };
    expect(result.title).toBe("Breaking Bad");
    expect(result.totalSeasons).toBe("5");
  });

  it("throws when the result is not a series", async () => {
    await expect(
      getSeriesTool.handler(
        { imdbId: "tt0111161" },
        clientsWith({ getById: async () => ({ Type: "movie" }) as never })
      )
    ).rejects.toThrow(/not a series/);
  });

  it("throws the guard error when neither imdbId nor title is given", async () => {
    await expect(getSeriesTool.handler({}, clientsWith({}))).rejects.toBeInstanceOf(
      ToolResponseError
    );
  });
});

describe("get_episode", () => {
  it("returns episode details", async () => {
    const result = (await getEpisodeTool.handler(
      { seriesId: "tt0903747", season: 1, episode: 1 },
      clientsWith({
        getEpisode: async () =>
          ({ Title: "Pilot", Season: "1", Episode: "1", imdbID: "tt0959621", seriesID: "tt0903747" }) as never,
      })
    )) as { title: string; imdbId: string };
    expect(result.title).toBe("Pilot");
    expect(result.imdbId).toBe("tt0959621");
  });
});

describe("get_season", () => {
  it("formats the season's episodes", async () => {
    const result = (await getSeasonTool.handler(
      { seriesId: "tt0411008", season: 1 },
      clientsWith({
        getSeason: async () =>
          ({
            Title: "Lost",
            Season: "1",
            totalSeasons: "6",
            Episodes: [
              { Title: "Pilot", Episode: "1", Released: "2004-09-22", imdbRating: "8.5", imdbID: "tt0636289" },
            ],
          }) as never,
      })
    )) as { episodes: Array<Record<string, unknown>> };
    expect(result.episodes).toEqual([
      { title: "Pilot", episode: "1", released: "2004-09-22", imdbRating: "8.5", imdbId: "tt0636289" },
    ]);
  });
});

describe("get_all_episodes", () => {
  it("aggregates episodes across seasons", async () => {
    const result = (await getAllEpisodesTool.handler(
      { seriesId: "tt0411008" },
      clientsWith({
        getAllEpisodes: async () =>
          [
            { Title: "Lost", Season: "1", totalSeasons: "2", Episodes: [{ Title: "E1", Episode: "1", Released: "x", imdbRating: "8", imdbID: "i1" }] },
            { Title: "Lost", Season: "2", totalSeasons: "2", Episodes: [{ Title: "E2", Episode: "1", Released: "y", imdbRating: "9", imdbID: "i2" }] },
          ] as never,
      })
    )) as { totalSeasons: number; seasons: Array<{ season: string; episodeCount: number }> };
    expect(result.totalSeasons).toBe(2);
    expect(result.seasons[1]).toMatchObject({ season: "2", episodeCount: 1 });
  });
});
