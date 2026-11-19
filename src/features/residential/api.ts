import { generationResponseSchema, type GeneratorInput } from "./schema";
import { request } from "@/lib/http-client";

export function generateProxies(
  input: GeneratorInput,
): Promise<{ data: string[]; message: string }> {
  return request("/api/residential/list", generationResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
}
