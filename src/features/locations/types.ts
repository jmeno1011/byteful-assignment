import type { z } from "zod";
import type { lookupOptionSchema, lookupPageSchema } from "./schema";

export type LookupKind = "countries" | "cities" | "asns";
export type LookupOption = z.infer<typeof lookupOptionSchema>;
export type LookupPage = z.infer<typeof lookupPageSchema>;
export type LookupSort = "asc" | "desc";
export interface LookupQuery {
  sort?: LookupSort;
  q?: string;
  country?: string;
  page?: number;
}
