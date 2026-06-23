import { describe, it, expect } from "bun:test";
import { resolveMedia } from "../helpers/resolvers.js";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";
import type { ToolClients } from "../define-tool.js";

const clientsWith = (
  tmdb: Parameters<typeof createFakeTmdbClient>[0]
): ToolClients => ({
  tmdb: createFakeTmdbClient(tmdb),
  omdb: createFakeOmdbClient(),
});

describe("resolveMedia input forms", () => {
  it("resolves a movie by tmdbId", async () => {
    const media = await resolveMedia(
      clientsWith({ getMovieDetails: async () => ({ id: 1, title: "Movie" }) as never }),
      { mediaType: "movie", tmdbId: 1 }
    );
    expect(media).toEqual({ type: "movie", id: 1, name: "Movie" });
  });

  it("resolves a movie by imdbId", async () => {
    const media = await resolveMedia(
      clientsWith({ getMovieByImdbId: async () => ({ id: 2, title: "By IMDb" }) as never }),
      { mediaType: "movie", imdbId: "tt2" }
    );
    expect(media).toEqual({ type: "movie", id: 2, name: "By IMDb" });
  });

  it("resolves a movie by title via search", async () => {
    const media = await resolveMedia(
      clientsWith({
        searchMovies: async () =>
          ({ page: 1, total_pages: 1, total_results: 1, results: [{ id: 3, title: "Found" }] }) as never,
      }),
      { mediaType: "movie", title: "found" }
    );
    expect(media).toEqual({ type: "movie", id: 3, name: "Found" });
  });

  it("resolves a tv series by tmdbId", async () => {
    const media = await resolveMedia(
      clientsWith({ getTvDetails: async () => ({ id: 4, name: "Show" }) as never }),
      { mediaType: "tv", tmdbId: 4 }
    );
    expect(media).toEqual({ type: "tv", id: 4, name: "Show" });
  });

  it("resolves a tv series by title via search", async () => {
    const media = await resolveMedia(
      clientsWith({
        searchTv: async () =>
          ({ page: 1, total_pages: 1, total_results: 1, results: [{ id: 5, name: "TV Found" }] }) as never,
      }),
      { mediaType: "tv", title: "tv found" }
    );
    expect(media).toEqual({ type: "tv", id: 5, name: "TV Found" });
  });

  it("defaults to movie when mediaType is omitted", async () => {
    const media = await resolveMedia(
      clientsWith({ getMovieDetails: async () => ({ id: 6, title: "Default" }) as never }),
      { tmdbId: 6 }
    );
    expect(media.type).toBe("movie");
  });
});

describe("resolveMedia guards", () => {
  it("rejects empty input with the at-least-one message", async () => {
    await expect(resolveMedia(clientsWith({}), {})).rejects.toThrow(
      "At least one of 'tmdbId', 'imdbId', 'title' must be provided"
    );
  });

  it("rejects an IMDb-only lookup for a tv series", async () => {
    await expect(
      resolveMedia(clientsWith({}), { mediaType: "tv", imdbId: "tt1" })
    ).rejects.toThrow(/only supported for movies/);
  });

  it("throws when a movie title has no matches", async () => {
    await expect(
      resolveMedia(
        clientsWith({
          searchMovies: async () =>
            ({ page: 1, total_pages: 1, total_results: 0, results: [] }) as never,
        }),
        { title: "nothing" }
      )
    ).rejects.toThrow(/No movies found matching title: nothing/);
  });

  it("throws when an IMDb id resolves to nothing", async () => {
    await expect(
      resolveMedia(
        clientsWith({ getMovieByImdbId: async () => null }),
        { imdbId: "tt404" }
      )
    ).rejects.toThrow(/Movie not found for IMDb ID: tt404/);
  });
});
