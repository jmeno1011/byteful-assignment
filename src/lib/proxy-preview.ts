// masking display result
/** Build display-only text. Copy and download must keep using the original proxy. */
export function maskProxyPassword(proxy: string, password: string): string {
  const suffix = `:${password}@residential.byteful.com:8000`;
  // Match the known credential suffix instead of parsing arbitrary literal credentials as a URL.
  if (!password || !proxy.endsWith(suffix)) return "Proxy preview unavailable.";
  return `${proxy.slice(0, -suffix.length)}:${maskPassword(password)}@residential.byteful.com:8000`;
}

export function maskPassword(password: string): string {
  const characters = Array.from(password);
  return characters.length <= 4
    ? "*".repeat(characters.length)
    : characters.slice(0, 2).join("") +
    "*".repeat(characters.length - 4) +
    characters.slice(-2).join("");
}
