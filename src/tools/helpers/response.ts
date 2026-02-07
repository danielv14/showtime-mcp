import { capTotalPages } from "./constants.js";

export const createSuccessResponse = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export const createErrorResponse = (context: string, error: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: `Error ${context}: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
    },
  ],
  isError: true,
});

/** Create a success response with standard pagination fields */
export const createPaginatedResponse = (
  apiResponse: { total_results: number; page: number; total_pages: number },
  data: Record<string, unknown>
) =>
  createSuccessResponse({
    ...data,
    totalResults: apiResponse.total_results,
    page: apiResponse.page,
    totalPages: capTotalPages(apiResponse.total_pages),
  });
