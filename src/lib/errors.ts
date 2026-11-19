import { ZodError } from "zod";
import { errorDefinitions, type ErrorCode } from "./error-definitions";

export class ServerError extends Error {
  readonly status: number;
  constructor(
    public code: ErrorCode,
    message: string = errorDefinitions[code].message,
    public retryAfter?: string,
  ) {
    super(message);
    this.status = errorDefinitions[code].status;
  }
}

export function errorResponse(error: unknown): Response {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return Response.json(
      {
        error: "invalid_parameter",
        message: `${issue.path.join(".") || "body"}: ${issue.message}`,
      },
      { status: errorDefinitions.invalid_parameter.status, headers },
    );
  }
  if (error instanceof ServerError) {
    if (error.retryAfter) headers["Retry-After"] = error.retryAfter;
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status, headers },
    );
  }
  // Do not serialize unexpected errors: upstream payloads may include secrets + server error.
  return Response.json(
    {
      error: "internal_error",
      message: errorDefinitions.internal_error.message,
    },
    { status: errorDefinitions.internal_error.status, headers },
  );
}
