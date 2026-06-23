import type { TmdbClient } from "../../tmdb-api/index.js";
import type { OmdbClient } from "../../omdb-api/index.js";

/**
 * Build an in-memory test double for a client. Any method named in `overrides`
 * is used as-is; any other method throws when called, so a test only configures
 * the calls it expects to exercise. `defaults` supplies non-throwing baseline
 * methods (e.g. a real `getImageUrl`).
 */
const createFake = <T extends object>(
  label: string,
  defaults: Partial<T>,
  overrides: Partial<T>
): T =>
  new Proxy({} as T, {
    get(_target, prop) {
      // Keep the proxy a plain (non-thenable) object so it is safe to await or
      // resolve through promises; only configured methods are exposed.
      if (typeof prop === "symbol" || prop === "then") return undefined;
      if (prop in overrides) return (overrides as Record<string, unknown>)[prop];
      if (prop in defaults) return (defaults as Record<string, unknown>)[prop];
      return () => {
        throw new Error(
          `fake ${label}: '${prop}' was called but not configured`
        );
      };
    },
  });

const fakeGetImageUrl = (path: string | null, size = "w500"): string | null =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

export const createFakeTmdbClient = (
  overrides: Partial<TmdbClient> = {}
): TmdbClient =>
  createFake<TmdbClient>("tmdb", { getImageUrl: fakeGetImageUrl }, overrides);

export const createFakeOmdbClient = (
  overrides: Partial<OmdbClient> = {}
): OmdbClient => createFake<OmdbClient>("omdb", {}, overrides);
