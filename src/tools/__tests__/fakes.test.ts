import { describe, it, expect } from "bun:test";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";

describe("fake clients", () => {
  it("exposes configured overrides", async () => {
    const tmdb = createFakeTmdbClient({
      getTvDetails: async () => ({ id: 1, name: "Severance" }) as never,
    });
    expect((await tmdb.getTvDetails(1)).name).toBe("Severance");
  });

  it("provides a working default getImageUrl", () => {
    const tmdb = createFakeTmdbClient();
    expect(tmdb.getImageUrl("/p.jpg", "w92")).toBe(
      "https://image.tmdb.org/t/p/w92/p.jpg"
    );
    expect(tmdb.getImageUrl(null)).toBeNull();
  });

  it("throws a helpful error when an unconfigured method is called", () => {
    const omdb = createFakeOmdbClient();
    expect(() => omdb.getById({ imdbId: "tt1" })).toThrow(
      "fake omdb: 'getById' was called but not configured"
    );
  });

  it("is awaitable (not mistaken for a thenable)", async () => {
    const tmdb = createFakeTmdbClient();
    const resolved = await Promise.resolve(tmdb);
    expect(resolved).toBe(tmdb);
  });
});
