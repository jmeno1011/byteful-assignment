import {
  lookupKindSchema,
  lookupQuerySchema,
} from "@/features/locations/schema";
import { lookup } from "@/lib/server/byteful";
import { ServerError, errorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string }> },
): Promise<Response> {
  try {
    const kind = lookupKindSchema.parse((await context.params).kind);
    const query = lookupQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (kind === "cities" && !query.country)
      throw new ServerError(
        "invalid_parameter",
        "Choose a country before searching for cities.",
      );
    return Response.json(await lookup(kind, query), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
