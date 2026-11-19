import "server-only";
import { z } from "zod";
import { bytefulError, bytefulHttpError } from "./byteful-errors";
import type {
  LookupKind,
  LookupPage,
  LookupQuery,
} from "@/features/locations/types";

const PAGE_SIZE = 50;
const CACHE_LIMIT = 300;
const cache = new Map<string, { value: LookupPage; expires: number }>();
const pending = new Map<string, Promise<LookupPage>>();
const nodeCount = z.number().int().nonnegative().optional();
const records = {
  countries: z.object({
    country_id: z.string(),
    country_name: z.string(),
    country_node_count: nodeCount,
  }),
  cities: z.object({
    city_alias: z.string(),
    city_name: z.string(),
    subdivision_id: z.string(),
    city_node_count: nodeCount,
  }),
  asns: z.object({
    asn_id: z.number().int(),
    asn_name: z.string(),
    country_id: z.string(),
    asn_node_count: nodeCount,
  }),
};
const resources = { countries: "country", cities: "city", asns: "asn" };

// Process-local TTL + in-flight deduplication; replace with a shared cache for multi-instance hosting.
export function clearLookupCache() {
  cache.clear();
  pending.clear();
}

async function fetchLookup(
  kind: LookupKind,
  query: LookupQuery,
): Promise<LookupPage> {
  const publicKey = process.env.BYTEFUL_API_PUBLIC_KEY;
  const privateKey = process.env.BYTEFUL_API_PRIVATE_KEY;
  if (!publicKey || !privateKey)
    throw bytefulError("configuration_error");
  const page = query.page ?? 1;
  const url = new URL(
    `https://api.byteful.com/1.0/public/user/${resources[kind]}/search`,
  );
  url.searchParams.set("per_page", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  // Explicit direction is required by the live API; keep sorting global before pagination.
  url.searchParams.set(
    "sort_by",
    `${resources[kind]}_name_${query.sort ?? "asc"}`,
  );
  if (query.country && kind === "cities")
    url.searchParams.set("like_subdivision_id", `${query.country}%`);
  if (query.country && kind === "asns")
    url.searchParams.set("country_id", query.country);
  if (query.q) {
    if (kind === "asns" && /^\d+$/.test(query.q))
      url.searchParams.set("asn_id", query.q);
    else url.searchParams.set(`like_${resources[kind]}_name`, `%${query.q}%`);
  }
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-API-Public-Key": publicKey,
        "X-API-Private-Key": privateKey,
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw bytefulError("upstream_unavailable");
  }
  if (!response.ok) throw bytefulHttpError(response);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw bytefulError(
      "upstream_response_invalid",
      "Byteful returned an unreadable response. Please retry.",
    );
  }
  const envelope = z
    .object({
      data: z.array(z.unknown()),
      total_count: z.number().int().nonnegative(),
    })
    .safeParse(body);
  if (!envelope.success)
    throw bytefulError("upstream_response_invalid");
  const data = envelope.data.data.map((item) => {
    if (kind === "countries") {
      const parsed = records.countries.safeParse(item);
      if (parsed.success)
        return {
          value: parsed.data.country_id,
          label: parsed.data.country_name,
          nodeCount: parsed.data.country_node_count,
        };
    } else if (kind === "cities") {
      const parsed = records.cities.safeParse(item);
      if (parsed.success)
        return {
          value: parsed.data.city_alias,
          label: parsed.data.city_name,
          detail: parsed.data.subdivision_id,
          nodeCount: parsed.data.city_node_count,
        };
    } else {
      // TODO: Choose the cache time based on how fresh the node count needs to be.
      // Keep ASN details and node counts together, or use separate caches if they need different update times.
      // Check if Byteful can return only node counts. If not, updates still need the full response.
      // Update the browser cache policy too.
      const parsed = records.asns.safeParse(item);
      if (parsed.success)
        return {
          value: String(parsed.data.asn_id),
          label: parsed.data.asn_name,
          detail: `AS${parsed.data.asn_id}`,
          nodeCount: parsed.data.asn_node_count,
        };
    }
    throw bytefulError("upstream_response_invalid");
  });
  return { data, page, hasMore: page * PAGE_SIZE < envelope.data.total_count };
}

export async function lookup(
  kind: LookupKind,
  query: LookupQuery,
): Promise<LookupPage> {
  const key = JSON.stringify([
    kind,
    query.country ?? "",
    query.q ?? "",
    query.page ?? 1,
    query.sort ?? "asc",
  ]);
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value;
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const task = fetchLookup(kind, query)
    .then((value) => {
      // Bound arbitrary search terms so cache memory does not grow indefinitely.
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      cache.set(key, {
        value,
        expires: Date.now() + (kind === "countries" ? 3_600_000 : 300_000),
      });
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
