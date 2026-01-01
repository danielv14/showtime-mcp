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
