import { z } from "zod";

const errorResponseSchema = z.object({
  error: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export class ApiResponseError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

// Validate responses before they reach UI state or a domain cache.
export async function request<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiResponseError(
      "Could not connect. Check your connection and try again.",
      "network_error",
      0,
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiResponseError(
      "The server returned an unreadable response. Please retry.",
      "invalid_response",
      response.status,
    );
  }
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    throw new ApiResponseError(
      parsed.success
        ? parsed.data.message
        : "The request failed. Please retry.",
      parsed.success ? parsed.data.error : "request_failed",
      response.status,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ApiResponseError(
      "The server returned unexpected data. Please retry.",
      "invalid_response",
      response.status,
    );
  return parsed.data;
}
