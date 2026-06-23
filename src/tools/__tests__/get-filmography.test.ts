import { describe, it, expect } from "bun:test";
import { getFilmographyTool } from "../get-filmography.js";
import { createFakeTmdbClient, createFakeOmdbClient } from "./fakes.js";
import type { ToolClients } from "../define-tool.js";
import type {
  TmdbMovieCredit,
  TmdbPersonMovieCredits,
  TmdbPersonDetails,
} from "../../tmdb-api/types.js";

const credit = (o: Partial<TmdbMovieCredit>): TmdbMovieCredit =>
  ({
    id: 0,
    title: "Untitled",
    original_title: "Untitled",
    release_date: "2000-01-01",
    poster_path: null,
    vote_average: 5,
    vote_count: 1,
    credit_id: "c",
    ...o,
  }) as TmdbMovieCredit;

const person = (): TmdbPersonDetails =>
  ({
    id: 1,
    name: "Jane Doe",
    biography: "bio",
    birthday: "1970-01-01",
    deathday: null,
    place_of_birth: "Earth",
    profile_path: null,
    imdb_id: "nm1",
    known_for_department: "Acting",
  }) as TmdbPersonDetails;

const clientsWith = (creditsValue: TmdbPersonMovieCredits): ToolClients => ({
  tmdb: createFakeTmdbClient({
    getPersonDetails: async () => person(),
    getPersonMovieCredits: async () => creditsValue,
  }),
  omdb: createFakeOmdbClient(),
});

type Film = { tmdbId: number; title: string; roles: string[]; year: string };
const films = (result: unknown) =>
  (result as { filmography: Film[] }).filmography;

describe("get_filmography role filtering", () => {
  it("returns only directing credits when role=director", async () => {
    const result = await getFilmographyTool.handler(
      { personId: 1, role: "director" },
      clientsWith({
        id: 1,
        cast: [credit({ id: 100, title: "Acted In", character: "Hero" })],
        crew: [
          credit({ id: 200, title: "Directed", job: "Director" }),
          credit({ id: 300, title: "Produced", job: "Producer" }),
        ],
      })
    );
    const titles = films(result).map((f) => f.title);
    expect(titles).toEqual(["Directed"]);
  });
});

describe("get_filmography de-duplication across roles", () => {
  it("merges the same movie credited as both actor and director into one entry", async () => {
    const result = await getFilmographyTool.handler(
      { personId: 1, role: "all", sortBy: "title" },
      clientsWith({
        id: 1,
        cast: [credit({ id: 100, title: "Dual", character: "Self" })],
        crew: [credit({ id: 100, title: "Dual", job: "Director" })],
      })
    );
    const entries = films(result).filter((f) => f.tmdbId === 100);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.roles).toEqual(["Actor (Self)", "Director"]);
  });
});

describe("get_filmography year-range filtering", () => {
  it("keeps only credits within [minYear, maxYear]", async () => {
    const result = await getFilmographyTool.handler(
      { personId: 1, role: "actor", minYear: 2005, maxYear: 2015 },
      clientsWith({
        id: 1,
        cast: [
          credit({ id: 1, title: "Too Old", character: "x", release_date: "2000-01-01" }),
          credit({ id: 2, title: "In Range", character: "x", release_date: "2010-01-01" }),
          credit({ id: 3, title: "Too New", character: "x", release_date: "2020-01-01" }),
        ],
        crew: [],
      })
    );
    expect(films(result).map((f) => f.title)).toEqual(["In Range"]);
  });
});

describe("get_filmography sort modes", () => {
  const sample = (): TmdbPersonMovieCredits => ({
    id: 1,
    cast: [
      credit({ id: 1, title: "Bravo", character: "x", release_date: "2010-01-01", vote_average: 6 }),
      credit({ id: 2, title: "Alpha", character: "x", release_date: "2020-01-01", vote_average: 9 }),
      credit({ id: 3, title: "Charlie", character: "x", release_date: "2000-01-01", vote_average: 7 }),
    ],
    crew: [],
  });

  it("sorts by date (newest first)", async () => {
    const result = await getFilmographyTool.handler(
      { personId: 1, role: "actor", sortBy: "date" },
      clientsWith(sample())
    );
    expect(films(result).map((f) => f.year)).toEqual(["2020", "2010", "2000"]);
  });

  it("sorts by rating (highest first)", async () => {
    const result = await getFilmographyTool.handler(
      { personId: 1, role: "actor", sortBy: "rating" },
      clientsWith(sample())
    );
    expect(films(result).map((f) => f.title)).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorts by title (alphabetical)", async () => {
    const result = await getFilmographyTool.handler(
      { personId: 1, role: "actor", sortBy: "title" },
      clientsWith(sample())
    );
    expect(films(result).map((f) => f.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("respects the limit", async () => {
    const result = await getFilmographyTool.handler(
      { personId: 1, role: "actor", sortBy: "rating", limit: 2 },
      clientsWith(sample())
    );
    expect(films(result)).toHaveLength(2);
  });
});
