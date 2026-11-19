import { generateList } from "@/features/residential/generator";
import { ServerError, errorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  try {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      throw new ServerError("invalid_json");
    }
    return Response.json(
      {
        data: generateList(input),
        message: "Residential list successfully generated.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
