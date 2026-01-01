import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient, TmdbMovieCredit } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers.js";

export const registerGetFilmographyTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_filmography",
    {
      title: "Get Filmography",
      description:
        "Get a person's complete filmography. Use search_person first to get the TMDB person ID.",
      inputSchema: {
        personId: z
          .number()
          .describe("TMDB person ID (use search_person to find this)"),
        role: z
          .enum(["director", "actor", "writer", "producer", "all"])
          .optional()
          .describe("Filter by role (default: 'all')"),
        sortBy: z
          .enum(["date", "rating", "title"])
          .optional()
          .describe("Sort by: 'date' (newest first), 'rating' (highest first), or 'title' (alphabetical)"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of movies to return (default: 50)"),
      },
    },
    async ({ personId, role = "all", sortBy = "date", limit = 50 }) => {
      try {
        // Get person details and credits in parallel
        const [personDetails, movieCredits] = await Promise.all([
          tmdbClient.getPersonDetails(personId),
          tmdbClient.getPersonMovieCredits(personId),
        ]);

        // Filter credits based on role
        let filteredCredits: Array<TmdbMovieCredit & { creditType: "cast" | "crew" }> = [];

        if (role === "all" || role === "actor") {
          filteredCredits.push(
            ...movieCredits.cast.map((credit) => ({
              ...credit,
              creditType: "cast" as const,
            }))
          );
        }

        if (role === "all" || role === "director") {
          filteredCredits.push(
            ...movieCredits.crew
              .filter((credit) => credit.job === "Director")
              .map((credit) => ({
                ...credit,
                creditType: "crew" as const,
              }))
          );
        }

        if (role === "all" || role === "writer") {
          filteredCredits.push(
            ...movieCredits.crew
              .filter(
                (credit) =>
                  credit.job === "Writer" ||
                  credit.job === "Screenplay" ||
                  credit.job === "Story" ||
                  credit.department === "Writing"
              )
              .map((credit) => ({
                ...credit,
                creditType: "crew" as const,
              }))
          );
        }

        if (role === "all" || role === "producer") {
          filteredCredits.push(
            ...movieCredits.crew
              .filter(
                (credit) =>
                  credit.job === "Producer" ||
                  credit.job === "Executive Producer"
              )
              .map((credit) => ({
                ...credit,
                creditType: "crew" as const,
              }))
          );
        }

        // Remove duplicates (same movie can appear multiple times with different roles)
        const uniqueCreditsMap = new Map<
          number,
          TmdbMovieCredit & { creditType: "cast" | "crew"; roles: string[] }
        >();

        for (const credit of filteredCredits) {
          const existing = uniqueCreditsMap.get(credit.id);
          const roleStr =
            credit.creditType === "cast"
              ? `Actor (${credit.character || "N/A"})`
              : credit.job || "Unknown";

          if (existing) {
            if (!existing.roles.includes(roleStr)) {
              existing.roles.push(roleStr);
            }
          } else {
            uniqueCreditsMap.set(credit.id, {
              ...credit,
              roles: [roleStr],
            });
          }
        }

        let sortedCredits = Array.from(uniqueCreditsMap.values());

        // Sort credits
        switch (sortBy) {
          case "date":
            sortedCredits.sort((a, b) => {
              const dateA = a.release_date || "0000";
              const dateB = b.release_date || "0000";
              return dateB.localeCompare(dateA); // Newest first
            });
            break;
          case "rating":
            sortedCredits.sort((a, b) => b.vote_average - a.vote_average);
            break;
          case "title":
            sortedCredits.sort((a, b) => a.title.localeCompare(b.title));
            break;
        }

        // Apply limit
        sortedCredits = sortedCredits.slice(0, limit);

        // Format output
        const formattedCredits = sortedCredits.map((credit) => ({
          tmdbId: credit.id,
          title: credit.title,
          year: credit.release_date?.split("-")[0] || "N/A",
          roles: credit.roles,
          tmdbRating: credit.vote_average,
          voteCount: credit.vote_count,
          posterUrl: tmdbClient.getImageUrl(credit.poster_path, "w185"),
        }));

        return createSuccessResponse({
          person: {
            tmdbId: personDetails.id,
            name: personDetails.name,
            knownFor: personDetails.known_for_department,
            birthday: personDetails.birthday,
            deathday: personDetails.deathday,
            placeOfBirth: personDetails.place_of_birth,
            biography:
              personDetails.biography.length > 500
                ? personDetails.biography.substring(0, 500) + "..."
                : personDetails.biography,
            profileImageUrl: tmdbClient.getImageUrl(
              personDetails.profile_path,
              "w185"
            ),
            imdbId: personDetails.imdb_id,
          },
          filmography: formattedCredits,
          totalCredits: uniqueCreditsMap.size,
          filters: {
            role,
            sortBy,
            limit,
          },
        });
      } catch (error) {
        return createErrorResponse("getting filmography", error);
      }
    }
  );
};
