import type { LookupKind, LookupPage, LookupQuery } from "./types";
import { lookupPageSchema } from "./schema";
import { request } from "@/lib/http-client";

// make cache storage
const cache = new Map<string, { data: LookupPage; expires: number }>();
export async function searchLocations(
  kind: LookupKind,
  query: LookupQuery,
  signal: AbortSignal,
): Promise<LookupPage> {
  const params = new URLSearchParams();
  if (query.country) params.set("country", query.country);
  if (query.q) params.set("q", query.q);
  params.set("page", String(query.page ?? 1));
  params.set("sort", query.sort ?? "asc");
  // url
  const url = `/api/lookups/${kind}?${params}`;

  // cache check
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.data;

  // no cache
  const data = await request(url, lookupPageSchema, { signal });
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(url, { data, expires: Date.now() + 60_000 });

  return data;
}
