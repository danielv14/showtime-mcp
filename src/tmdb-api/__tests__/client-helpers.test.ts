import { describe, it, expect } from "bun:test";
import { buildSearchParams } from "../client.js";

describe("buildSearchParams", () => {
  it("includes only defined keys", () => {
    expect(
      buildSearchParams({ query: "dune", page: 2, year: undefined })
    ).toEqual({ query: "dune", page: 2 });
  });

  it("drops every undefined value", () => {
    expect(
      buildSearchParams({ page: undefined, region: undefined })
    ).toEqual({});
  });

  it("renames the dotted range params to their TMDB names", () => {
    expect(
      buildSearchParams({
        vote_average_gte: 7,
        vote_average_lte: 9,
        vote_count_gte: 50,
        with_runtime_gte: 60,
        with_runtime_lte: 150,
      })
    ).toEqual({
      "vote_average.gte": 7,
      "vote_average.lte": 9,
      "vote_count.gte": 50,
      "with_runtime.gte": 60,
      "with_runtime.lte": 150,
    });
  });

  it("passes through keys that already match TMDB param names", () => {
    expect(
      buildSearchParams({
        page: 1,
        region: "SE",
        sort_by: "popularity.desc",
        with_genres: "28",
        first_air_date_year: 2023,
      })
    ).toEqual({
      page: 1,
      region: "SE",
      sort_by: "popularity.desc",
      with_genres: "28",
      first_air_date_year: 2023,
    });
  });

  it("keeps a defined zero rather than treating it as absent", () => {
    expect(buildSearchParams({ page: 0 })).toEqual({ page: 0 });
  });
});
