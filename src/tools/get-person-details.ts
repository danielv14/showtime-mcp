import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TmdbClient } from "../tmdb-api/index.js";
import { createSuccessResponse, createErrorResponse } from "./helpers/response.js";

export const registerGetPersonDetailsTool = (
  server: McpServer,
  tmdbClient: TmdbClient
) => {
  server.registerTool(
    "get_person_details",
    {
      title: "Get Person Details",
      description:
        "Get detailed information about an actor, director, or other crew member including biography, birthday, place of birth, and profile image. Use search_person first to get the TMDB person ID.",
      inputSchema: {
        personId: z
          .number()
          .describe("TMDB person ID (use search_person to find this)"),
      },
    },
    async ({ personId }) => {
      try {
        const person = await tmdbClient.getPersonDetails(personId);

        return createSuccessResponse({
          tmdbId: person.id,
          name: person.name,
          knownFor: person.known_for_department,
          biography: person.biography || "No biography available.",
          birthday: person.birthday,
          deathday: person.deathday,
          placeOfBirth: person.place_of_birth,
          imdbId: person.imdb_id,
          profileImageUrl: tmdbClient.getImageUrl(person.profile_path, "w500"),
        });
      } catch (error) {
        return createErrorResponse("getting person details", error);
      }
    }
  );
};
