# Byteful · Residential Proxy Generator

## Instructions to run the app

### 1. Download the GitHub repository

Download and extract the repository using **Code → Download ZIP**, or clone it:

```sh
git clone <repository-url> interview-takehome-full-stack
cd interview-takehome-full-stack
```

Replace `<repository-url>` with this repository's GitHub URL. If you downloaded a ZIP, open a terminal in the extracted project directory instead.

### 2. Set the Node.js version

Use **Node.js 24** for the development environment used for this project. The package declares a minimum of Node.js 22.

If you use nvm:

```sh
nvm install 24
nvm use 24
node --version
npm --version
```

Otherwise, install Node.js 24 and confirm that `node --version` reports `v24.x.x`.

### 3. Install dependencies

```sh
npm install
```

### 4. Obtain and configure the environment variables

1. Create an account or sign in at [Byteful Dashboard](https://dashboard.byteful.com).
2. Open [Developer → API Key](https://dashboard.byteful.com/developer/api-key) and create an API key pair.
3. Copy the public key and private key.
4. In the project root, create `.env.local` from the example:

```sh
cp .env.example .env.local
```

5. Set both values in `.env.local`:

```dotenv
BYTEFUL_API_PUBLIC_KEY=your_public_key
BYTEFUL_API_PRIVATE_KEY=your_private_key
```

These are **Byteful API keys**, used by the server for country, city and ASN lookups. They are different from the **Proxy user ID** and **Proxy password** entered in the generator.

Keep the keys in server-only environment variables. Do not use a `NEXT_PUBLIC_*` prefix or commit `.env.local`. Restart the development server after changing the environment variables.

### 5. Start the app

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Stop the server with `Ctrl+C`.

### Quick guide: generate proxies

1. Enter your **Proxy user ID** and **Proxy password**. Missing values are highlighted when you click Generate.
2. Choose a protocol (**HTTP, HTTPS, SOCKS5 or SOCKS5H**), session type (**Sticky or Rotating**) and quantity (**1–1,000**).
3. Optionally select a country, city and ISP/ASN. City requires a country; ASN can be selected independently. Search results are ordered A–Z.
4. Click **Generate proxies**. After success, the page moves to **Your proxy list** and displays the generated configuration.
5. Use **Copy all** or **Download .txt**. The screen masks passwords, but copied/downloaded strings contain the original credentials needed for a connection. Use **Clear** to clear the result while keeping the form settings.

Generation builds connection strings locally on the app server; it does not create proxy accounts or verify that the supplied credentials work. Actual connections require valid Byteful proxy credentials and an active service.

## Assumptions

- **The user is already logged in.** This page is intended to be embedded in an existing authenticated service. The standalone take-home app does not implement login or enforce account ownership.
- **The surrounding service can contain incidents if proxy credentials are exposed.** This assumes external account-level safeguards, such as usage limits, access restrictions and credential revocation/rotation. Those safeguards are outside this page's implementation; login and UI masking alone do not make leaked credentials safe.
- **The main content is reusable inside an existing layout.** The generator functionality inside `<main>` can be integrated into the host application's layout. Shared sidebar, header and footer design was therefore kept minimal rather than treated as the main scope of this page.

## API

### `POST /api/residential/list`

```sh
curl http://localhost:3000/api/residential/list \
  -H 'Content-Type: application/json' \
  -d '{"proxy_user_id":"alice","proxy_user_password":"secretpass","list_count":2,"list_format":"http","list_session_type":"sticky","country_id":"gb","city_alias":"london","asn_id":2856}'
```

Successful response:

```json
{
  "data": [
    "http://alice_c_gb_city_london_asn_2856_s_EXAMPLE123456789:secretpass@residential.byteful.com:8000"
  ],
  "message": "Residential list successfully generated."
}
```

The session above is illustrative. Real sessions contain exactly 16 random uppercase letters/digits, produced using Node's cryptographic random generator with per-list uniqueness. Omit optional fields for 100 HTTP sticky entries. Rotating entries omit the session segment and are intentionally identical. Every protocol uses port 8000. This endpoint builds strings locally and never calls the upstream residential-list endpoint. Responses use `Cache-Control: no-store`.

### `GET /api/lookups/{countries|cities|asns}`

Parameters: optional `q` (up to 100 characters), `country` (lowercase two-letter code), `sort` (`asc` for A–Z, default; `desc` for Z–A), and `page` (positive integer, default 1). Country is required for cities. ASN country is optional. Unknown kinds and invalid query values return 400. Every page requests 50 upstream records.

```json
{
  "data": [{ "value": "gb", "label": "United Kingdom", "nodeCount": 253963 }],
  "page": 1,
  "hasMore": true
}
```

These routes call the corresponding country/city/ASN search endpoints. Cities use **`like_subdivision_id=gb%`**, encoded with `URLSearchParams` as `gb%25`; the live API requires the `like_` operator rather than plain equality. Text queries use `like_country_name`, `like_city_name` or `like_asn_name`; numeric ASN queries use `asn_id`. ASN requests include `country_id` when selected. Normalized options leave room for node counts and additional metadata.

### Error contract

Every application error has the same shape:

```json
{
  "error": "invalid_parameter",
  "message": "list_count: Quantity must be from 1 to 1,000."
}
```

| Error                            | Status | Action                                                                          |
| -------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `invalid_json`                   | 400    | Send valid JSON.                                                                |
| `invalid_parameter`              | 400    | Correct the named input, lookup kind or query.                                  |
| `configuration_error`            | 503    | Set both server environment variables and restart.                              |
| `upstream_authentication_failed` | 502    | Check the server's API keys and Byteful permissions.                            |
| `rate_limited`                   | 429    | Wait and retry; a sanitized `Retry-After` header is forwarded.                  |
| `upstream_unavailable`           | 502    | Retry after a network failure, 8-second timeout or other upstream HTTP failure. |
| `upstream_response_invalid`      | 502    | Byteful returned unreadable or unexpected data; retry/check the adapter.        |
| `internal_error`                 | 500    | Unexpected server failure; retry and investigate server-side.                   |

Browser-only failures use `network_error`, `invalid_response` or `request_failed` internally and display readable messages. Successful responses are validated with domain Zod schemas before use or caching. Invalid JSON or unexpected success data produces `invalid_response`; malformed error bodies use a safe `request_failed` fallback while preserving the HTTP status. Clipboard rejection suggests downloading or manually copying. Raw upstream responses, API keys and credentials are never logged or returned in error bodies.

## Structure

### Current structure

The structure below lists the source, assets, tests and configuration included in the Git submission, based on the current `.gitignore`.

```text
assignment_docs/                   Original assignment and reference screenshot
public/
  brand/byteful.svg                Local Byteful logo
src/
  app/
    api/
      residential/list/route.ts    Proxy generation endpoint
      lookups/[kind]/route.ts      Country, city and ASN lookup endpoint
    layout.tsx                    Root layout and bundled fonts
    page.tsx                      Generator page entry point
    globals.css                   Design tokens, resets, base controls and shared utilities
    icon.svg                      App icon
  components/
    generator.tsx                 Page composition
    generator-form.tsx            Form container, validation summary and submit button
    credentials-fields.tsx        Proxy credentials and visibility control
    connection-options.tsx        Protocol, session type and quantity controls
    location-targeting.tsx        Country, city and ASN controls
    lookup-select.tsx             Searchable, debounced and paginated lookup control
    radio-option.tsx              Reusable radio option with optional icon and description
    result-panel.tsx              Masked results, exports and configuration summary
    header.tsx                    Logo header
    footer.tsx                    Brand attribution and completion date
    generator.module.css          Page layout and responsive grid
    generator-form.module.css     Shared form and section styles
    lookup-select.module.css      Lookup control styles
    radio-option.module.css       Radio option styles
    result-panel.module.css       Results, terminal and configuration styles
    header.module.css             Header styles
    footer.module.css             Footer styles
  features/
    residential/
      schema.ts                   Proxy request and success response validation
      generator.ts                Server-side proxy composition and session generation
      api.ts                      Browser proxy generation API
      types.ts                    Generated configuration snapshot type
      use-proxy-generator.ts      Form state, validation, generation and export actions
    locations/
      schema.ts                   Lookup request and success response validation
      types.ts                    Shared location lookup types
      api.ts                      Browser location lookup API and bounded query cache
  lib/
    http-client.ts                Validated browser HTTP transport and ApiResponseError
    proxy-preview.ts              Display-only password masking
    error-definitions.ts          Shared error codes, HTTP statuses and default messages
    errors.ts                     ServerError and consistent API error responses
    server/
      byteful-errors.ts           Byteful messages and upstream status translation
      byteful.ts                  Server-only Byteful adapter and bounded cache
tests/
  generator.test.ts               Generation and endpoint contract tests
  lookups.test.ts                 Lookup queries, caching and upstream errors
  errors.test.ts                  Error contract, upstream mapping and Retry-After safety
  http-client.test.ts             Browser response validation and invalid-cache protection
  ui.test.tsx                    Form and result user-flow tests
  proxy-preview.test.ts           Password masking tests
  server-only.ts                  Test-only replacement for server-only imports
.env.example                      Empty environment variable template
.gitignore                        Files excluded from Git
next.config.ts                    Next.js configuration and response headers
next-env.d.ts                     Next.js TypeScript declarations
vitest.config.ts                  Test runner configuration
tsconfig.json                     TypeScript configuration
package.json                      Dependencies and npm commands
package-lock.json                 Locked dependency versions
README.md                         Setup, assumptions, API contract and trade-offs
```

Local-only files and generated output are excluded from Git: `docs/`, `scripts/`, `AGENTS.md`, `Project_Content.md`, `.env*` except `.env.example`, `node_modules/`, `.next/`, `out/`, `coverage/`, `*.tsbuildinfo` and `.DS_Store`. The `assignment_docs/` directory is not excluded and remains part of the submission. The local smoke script is therefore not included in the structure above.

### Future feature structure (추후 변경될 Feature Structure)

The following structure is a proposed direction for when Overview and History are introduced. It has not been implemented. The current generator remains at `app/page.tsx`; the routes below illustrate a future multi-page application.

```text
src/
  app/
    generator/page.tsx            Compose the residential generator UI
    overview/page.tsx             Future overview page
    history/page.tsx              Future history page
    api/                          Existing generation and lookup endpoints
    layout.tsx                    Shared application layout
    globals.css                   Design tokens, resets and shared utilities
  features/
    residential/
      components/
        generator.tsx
        generator-form.tsx
        credentials-fields.tsx
        connection-options.tsx
        location-targeting.tsx
        result-panel.tsx
        *.module.css
      use-proxy-generator.ts
      api.ts                      Browser generation requests
      generator.ts                Server-side proxy generation
      schema.ts
      types.ts
    locations/
      components/
        lookup-select.tsx
        lookup-select.module.css
      api.ts                      Browser lookup requests and query cache
      schema.ts
      types.ts
    overview/                     Add when the overview feature is implemented
      components/
      api.ts
      types.ts
    history/                      Add when the history feature is implemented
      components/
      api.ts
      types.ts
  components/
    ui/
      radio-option.tsx
      radio-option.module.css
    layout/
      header.tsx
      header.module.css
      footer.tsx
      footer.module.css
  lib/
    http-client.ts
    proxy-preview.ts
    error-definitions.ts
    errors.ts
    server/
      byteful.ts
      byteful-errors.ts
```

- Keep domain-specific UI, types and API functions together under their feature. Location selection belongs to `locations`, even when multiple pages use it.
- Keep domain-independent UI such as radio options in `components/ui`, and shared headers and footers in `components/layout`.
- Keep each CSS Module beside the component that owns it. Residential form sections may continue sharing `generator-form.module.css` within their feature.
- Keep page files focused on composition. Create Overview and History directories when those features are implemented; this proposal does not add those pages or persist proxy history.
- The tree focuses on future source organization. Existing assets, tests and project configuration remain as described in the current structure.

## Decisions and trade-offs

### Small, explicit layers

- The generator page composes a form and result panel. The residential hook owns form state and generation/export actions; credentials, connection options and location targeting are separate UI sections.
- Browser API functions live with their domain. Only HTTP transport and response errors are shared; the browser location cache stays with the location API.
- CSS Modules scope component styles and responsive rules. Global CSS contains design tokens, resets, base controls and a few shared utilities.

- Zod is the single source of request validation. An additional target such as state/ZIP would add an optional schema field, an ordered username segment and a lookup/control, without putting network calls inside generation.
- Before sending a request, the frontend uses Zod to check data types and validation rules, preventing unnecessary API calls for invalid input. The server validates the request again.

### Bounded caches

- The browser query cache lasts 60 seconds and holds up to 100 entries. The server country cache lasts one hour; city/ASN caches last five minutes, with a shared 300-entry limit and in-flight deduplication. Failures are not cached.
- The Generate proxies button is disabled for at least 300 ms to prevent double clicks and rapid repeated submissions. An immediate submission lock blocks duplicate requests before the disabled state renders. Requests taking longer than 300 ms remain locked until completion.

### API rate limit

- Debounce and caching reduce lookup traffic; abort prevents stale search responses from updating the UI, but does not undo an upstream request already sent. A 429 response is shown explicitly rather than silently retried.
- This demo does not enforce a distributed quota against Byteful's account-wide 20 requests/second limit. Before public hosting, add application authentication, shared per-user rate limiting and an account-wide limiter for outbound Byteful requests.
- As a future service policy, request rates could differ by subscription tier, similar to the resource limits seen in services such as Supabase and cloud platforms. Per-tier limits would still need to fit within the shared upstream account quota. This subscription-based policy is not implemented in the demo.

### No persistence

- There is no database, analytics, persistent credential storage, saved presets or simulated account/billing functionality. Credentials and generated lines are held in component memory rather than persisted across reloads. Clearing a result removes its generated data while retaining the form inputs for reuse.
- Saved presets should persist only non-sensitive configuration, never the password. A future preset model can reuse `GeneratorInput` without its credential fields.
- Based on my experience using the EDF website, having to re-enter account details can be inconvenient. That experience also prompted a security trade-off: avoiding persistent credential storage reduces the amount of sensitive data retained, even though users lose some convenience. It does not eliminate exposure while credentials are in use or after export.
