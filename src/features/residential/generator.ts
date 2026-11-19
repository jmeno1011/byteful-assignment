// generate proxy
// following the Proxy string format rule
import { randomInt } from "node:crypto";
import { requestSchema } from "./schema";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateList(input: unknown): string[] {
  const options = requestSchema.parse(input);
  // Ordered segments keep future targets (state, ZIP) separate from rendering.
  const targets = [
    options.country_id ? `_c_${options.country_id}` : "",
    options.city_alias ? `_city_${options.city_alias}` : "",
    options.asn_id !== undefined ? `_asn_${options.asn_id}` : "",
  ].join("");
  const sessions = new Set<string>();
  return Array.from({ length: options.list_count }, () => {
    let session = "";
    // only create session when you select sticky
    if (options.list_session_type === "sticky") {
      do {
        // session_id
        session = Array.from(
          { length: 16 },
          () => ALPHABET[randomInt(ALPHABET.length)],
        ).join("");
      } while (sessions.has(session));
      sessions.add(session);
    }
    const username = `${options.proxy_user_id}${targets}${session ? `_s_${session}` : ""}`;
    // Preserve credentials literally, matching the take-home endpoint contract.
    // <list_format>://<username>:<proxy_user_password>@residential.byteful.com:8000
    return `${options.list_format}://${username}:${options.proxy_user_password}@residential.byteful.com:8000`;
  });
}
