import { z } from "zod";

// Required: proxy_user_id, proxy_user_password.
// Optional: all other fields; country_id is required when city_alias is provided.
export const requestSchema = z
  .object({
    // Any non-empty string. You do not need to check that the user exists.
    proxy_user_id: z.string().min(1, "Enter your proxy user ID."),
    // Any non-empty string. You do not need to check it.
    proxy_user_password: z.string().min(1, "Enter your proxy password."),
    // From 1 to 1000.
    list_count: z
      .number()
      .int("Quantity must be a whole number.")
      .min(1, "Quantity must be from 1 to 1,000.")
      .max(1000, "Quantity must be from 1 to 1,000.")
      .default(100),
    // http, https, socks5 or socks5h
    list_format: z.enum(["http", "https", "socks5", "socks5h"]).default("http"),
    // sticky or rotating
    list_session_type: z.enum(["sticky", "rotating"]).default("sticky"),
    country_id: z
      .string()
      .regex(/^[a-z]{2}$/, "Choose a lowercase two-letter country code.")
      .optional(),
    city_alias: z
      .string()
      .min(1, "Choose a city or clear city targeting.")
      .optional(),
    asn_id: z.number().int("ASN must be an integer.").optional(),
  })
  .refine((data) => !data.city_alias || !!data.country_id, {
    path: ["city_alias"],
    message: "Choose a country before selecting a city.",
  });
export type GeneratorInput = z.input<typeof requestSchema>;
export type GeneratorOptions = z.output<typeof requestSchema>;

// Public response from the local generation endpoint.
export const generationResponseSchema = z.object({
  data: z.array(z.string()),
  message: z.string(),
});
