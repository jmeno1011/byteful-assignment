# Proxy Generator - Full-Stack Take-Home Test

> [!WARNING]
> This repo holds two take-home tests, each on its own branch: `backend` and
> `full-stack`. Before you start, ask your contact at Byteful which test to do.

## Background

**Byteful** sells residential proxies. A customer connects to our residential
gateway with a username and a password. The username carries the targeting
options, for example the country and the city. Our routing service reads these
options and sends the request through a matching residential IP.

Customers do not write these usernames by hand. They use a **proxy generator**.
They pick the options in a form, and the generator returns a list of ready
proxy strings.

In this take-home test, you build your own version of that generator. You
build the frontend page and the backend endpoint behind it. You use the real
Byteful API for the location data.

---

## Overview

Build a Next.js application with these parts:

1. **A generator endpoint** - a server route that returns a list of proxy
   strings. It copies the behavior of our
   [Create Residential List](https://documentation.byteful.com/api-reference/residential/create-residential-list)
   endpoint.
2. **Lookup endpoints** - server routes that get countries, cities and ASNs
   from the Byteful API.
3. **A generator page** - a UI where a user picks the options, generates a
   list, and copies or downloads it.

---

## Setup

1. Create an account at [dashboard.byteful.com](https://dashboard.byteful.com).
2. Create an API key at
   [dashboard.byteful.com/developer/api-key](https://dashboard.byteful.com/developer/api-key).
   You get a public key and a private key.
3. Read the [API introduction](https://documentation.byteful.com/api-introduction).
   It explains the authentication headers and the rate limits.

### Keep the API key secret

The API key gives access to your Byteful account.

- Use the key only in server code.
- Never put the key in a `NEXT_PUBLIC_*` variable or in any code that runs in
  the browser.
- Never commit the key. Put it in `.env.local` and add an `.env.example` file
  without values.

We check this. A key that the browser can see fails the test.

---

## The Byteful API

All requests go to `https://api.byteful.com/1.0/`. Every request needs these
two headers:

```
X-API-Public-Key: <your public key>
X-API-Private-Key: <your private key>
```

Use these endpoints for the lookups:

| Data | Endpoint | Docs |
|---|---|---|
| Countries | `GET /public/user/country/search` | [Search Country](https://documentation.byteful.com/api-reference/country/search-country) |
| Cities | `GET /public/user/city/search` | [Search City](https://documentation.byteful.com/api-reference/city/search-city) |
| ASNs | `GET /public/user/asn/search` | [Search ASN](https://documentation.byteful.com/api-reference/asn/search-asn) |

The API allows 20 requests per second for each customer by default. Above
that limit, it returns `429`.

The city search has no `country_id` filter. To find the cities in a country,
filter on `subdivision_id` with the country code and a `%` wildcard. For
example, `subdivision_id=gb%` returns the cities in the United Kingdom. Encode the
`%` as `%25` in the URL. The API introduction explains the operators.

---

## API Specification

### POST /api/residential/list

Generate a list of residential proxy strings. Do not call the Byteful
residential list endpoint. Build the list in your own code.

**Request body:** a JSON object with these fields.

| Name | Type | Required | Default | Rules |
|---|---|---|---|---|
| `proxy_user_id` | string | yes | - | Any non-empty string. You do not need to check that the user exists. |
| `proxy_user_password` | string | yes | - | Any non-empty string. You do not need to check it. |
| `list_count` | integer | no | `100` | From 1 to 1000. |
| `list_format` | string | no | `http` | `http`, `https`, `socks5` or `socks5h`. |
| `list_session_type` | string | no | `sticky` | `sticky` or `rotating`. |
| `country_id` | string | no | - | Lowercase ISO 3166-1 alpha-2 code, for example `us`. |
| `city_alias` | string | no | - | The `city_alias` from the city search. Requires `country_id`. |
| `asn_id` | integer | no | - | The `asn_id` from the ASN search. |

A request can send `country_id`, `city_alias` and `asn_id` together.

**Success response (200):**

```json
{
  "data": [
    "http://alice_c_gb_city_norwich_s_DDINPY7TQ0781XEO:secretpass@residential.byteful.com:8000",
    "http://alice_c_gb_city_norwich_s_XIINPY7TQ0781XEA:secretpass@residential.byteful.com:8000"
  ],
  "message": "Residential list successfully generated."
}
```

**Error response (400):**

```json
{
  "error": "invalid_parameter",
  "message": "list_count must be from 1 to 1000"
}
```

You can choose your own error values. Keep the same body shape for every
error, and list your errors in your README.

### Proxy string format

Each proxy string has this format:

```
<list_format>://<username>:<proxy_user_password>@residential.byteful.com:8000
```

Use port `8000` for every format.

The username has this format. The parts in square brackets are optional.

```
<proxy_user_id>[_c_<country_id>[_city_<city_alias>]][_asn_<asn_id>][_s_<session_id>]
```

- Add `_s_<session_id>` only when `list_session_type` is `sticky`.
- `session_id` is 16 random uppercase letters and digits, for example
  `DDINPY7TQ0781XEO`.
- In a `sticky` list, every proxy string must have a unique session ID.
- A `rotating` list has no session ID, so all its strings are the same.

### Lookup routes

Add server routes that the page uses to get countries, cities and ASNs. You
choose their paths and shapes. The page must never call
`api.byteful.com` directly, because that needs the API key.

---

## The Generator Page

Build one page with these parts:

1. **Credentials** - fields for the proxy user ID and the password.
2. **Options** - the list count, the format and the session type.
3. **Targeting** - fields for the country, the city and the ASN. All three are
   optional.
   - The city field stays disabled until the user picks a country.
   - Show only the cities in the selected country.
   - The user can pick an ASN with or without a country. When the user picks
     a country, show only the ASNs in that country.
   - The city list is very large. The user must be able to search it.
4. **Result** - the generated list, with a button to copy all lines and a
   button to download them as a `.txt` file.
5. **States** - show a clear message for loading, for an empty result, and
   for every error.

You choose the layout and the styling. A plain page that works well scores
higher than a nice page that breaks.

### Our generator

This screenshot shows the generator in the Byteful dashboard. Use it to
understand what the product does and what our customers expect.

![The residential proxy generator in the Byteful dashboard](docs/byteful-generator.webp)

### Branding and design

- You can give your page the Byteful brand. This is optional.
- You can use our brand assets, for example the logo, the colors and the
  fonts. You can also use parts of our design system.
- Do not copy the generator UI in the screenshot exactly. Design your own
  page. We want to see how you think about the product.

---

## Evaluation Criteria

### Areas of Focus

- **Product thinking** - The page stops the user from making a request that
  the backend rejects. Messages tell the user what to do next.
- **Code structure** - The UI, the API client, the business logic and the
  server routes are separate.
- **Error handling** - Errors from the Byteful API, from validation and from
  the network are easy to debug and clear to the user.
- **Security** - The API key stays on the server.
- **Performance** - The search fields do not send a request on every key
  press. The app does not get the same lookup data many times.

### How We Score

We score your solution in three tiers. You must meet a tier before the next
tier counts.

1. **Working** - The app starts with the instructions in your README. The
   endpoint meets the spec. The page generates a list with each targeting
   option. The API key is not visible in the browser.
2. **Clean and extensible** - The code is separate as described above. Errors
   are consistent. It is easy to add a new targeting option, such as a zip
   code or a US state.
3. **Ready for future changes** - Your design can support features that this
   spec does not ask for, for example saved presets, or a node count next to
   each location. You can build these features or describe them in your
   README or in TODO comments. We value clear reasons and trade-offs more
   than the number of features.

### Trade-Offs

You can cut corners to keep the scope small. If you do, leave a comment that
explains what you would do with more time. For example:

```ts
// TODO cache the country list.
// Currently the server gets it from the Byteful API on every page load.
// The list changes rarely, so I would cache it for one hour with
// Next.js revalidation.
```

### Questions

If something in this spec is not clear, ask us. We welcome questions. We also
expect you to make reasonable assumptions on implementation details.

---

## Use of AI

We are an AI first company. We love AI. We spend thousands a month on our
staff to use Claude and agents but we HATE slop.

You can use AI tools for this test. If you use AI, you must still be able to
explain every line of your code as if you wrote it yourself. We will check
this in any follow-up conversation.

---

## Timing

We do not expect you to spend more than **3 hours** on this task. A working
solution that covers the core requirements is more valuable than a polished
but incomplete one.

Come to any follow-up conversation with ideas about how you would improve or
extend your solution.

---

## Deliverables

Submit your solution as a GitHub repository. It can be public or private.

Include a README with:

- Instructions to run the app, including the environment variables
- Any assumptions you made
- The error values that your endpoint returns

Also:

- Record a short video showing us round what you've made. Explain your
  development process and why you've built things the way you have.
