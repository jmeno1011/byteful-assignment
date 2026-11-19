import { z } from "zod";

export const lookupKindSchema = z.enum(["countries", "cities", "asns"]);

export const lookupQuerySchema = z.object({
  sort: z.enum(["asc", "desc"]).default("asc"),
  country: z
    .string()
    .regex(/^[a-z]{2}$/)
    .optional(),
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

export const lookupOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  detail: z.string().optional(),
  nodeCount: z.number().int().nonnegative().optional(),
});

export const lookupPageSchema = z.object({
  data: z.array(lookupOptionSchema),
  page: z.number().int().min(1),
  hasMore: z.boolean(),
});
