# ascendgtm-cli

The official CLI for [Ascend GTM](https://www.ascendgtm.net) — script Ascend's public,
no-auth agent tools and site content from the terminal, without hand-rolling MCP
JSON-RPC calls. This is the CLI referenced in ascendgtm.net's agent-readiness
surface (`/llms.txt`, `/.well-known/oauth-protected-resource`, the agent-skills
index) — a scriptable interface for agents and developers, not just a docs link.

It talks to two live, public sources:

- the Ascend GTM Gateway's public MCP endpoint (`POST /public-mcp` at
  `https://ascend-gateway-v5.ascendgtm.workers.dev`) — 5 read-only tools, no
  authentication required.
- ascendgtm.net's per-page markdown (`https://www.ascendgtm.net/<path>.md`).

## Install

Once published:

```bash
npm install -g ascendgtm-cli
ascendgtm --help
```

For local development (this repo, before publishing):

```bash
npm install
npm run build
node dist/cli.js --help

# or, to use the `ascendgtm` command name locally:
npm link
ascendgtm --help
```

## Usage

### `ascendgtm about`

Canonical Ascend GTM facts — positioning, principal, services, pricing, ICP, methodology.

```bash
$ ascendgtm about
{
  "name": "Ascend GTM",
  "principal": "Mishaal Murawala",
  ...
}
```

### `ascendgtm pricing [--json]`

The full pricing menu: fixed-scope fix sprints, the GTM Program retainer, hourly advisory.

```bash
$ ascendgtm pricing
{
  "fix_sprints": [
    { "name": "Attribution & Tracking Repair", "price_usd": 5500, ... },
    ...
  ],
  "gtm_program": { "price_usd_per_month": 10000, ... },
  "advisory_hourly": { "price_usd_per_hour": 300, ... }
}
```

### `ascendgtm check-fit --arr <number> --industry <string> [--pe-backed] --stage <string>`

Given a prospect's profile, returns a fit verdict with rationale.

```bash
$ ascendgtm check-fit --arr 3000000 --industry "B2B SaaS" --pe-backed --stage growth
{
  "fit": "yes",
  "rationale": "PE-backed portfolio companies are a core Ascend GTM fit...",
  "next_step": "Book a 30-minute working session: https://www.ascendgtm.net/contact"
}
```

### `ascendgtm book [--json]`

The booking link for a 30-minute working session, plus pre-call questions.

```bash
$ ascendgtm book
{
  "booking_url": "https://calendar.app.google/...",
  "pre_call_questions": [ ... ]
}
```

### `ascendgtm capabilities [--json]`

What this public, no-auth endpoint can do versus what requires the tenant-bound endpoint.

```bash
$ ascendgtm capabilities
{ "public_tools": [ "ascend_about", "ascend_pricing", ... ], ... }
```

### `ascendgtm page <path> [--list]`

Fetch a page's markdown from ascendgtm.net.

```bash
$ ascendgtm page pricing
# What I charge
You hire me for a fixed problem, ongoing leadership, or advice.
...

$ ascendgtm page --list
index
about
brand
...
```

### Global

- `ascendgtm --version`
- `ascendgtm --help` / `ascendgtm <command> --help`
- `--json` on most commands prints the raw JSON payload instead of formatted text
  (useful for piping into `jq` or another agent).

## Error handling

Network failures, non-2xx responses from the gateway, and 404s on `page` all print a
clear one-line message to stderr and exit with a non-zero status code — never an
unhandled stack trace.

## Development

```bash
npm run build   # compile TypeScript -> dist/
npm test        # run the vitest suite (network calls are mocked)
```

## Publishing (not done by this commit)

The package is fully built, tested, and verified against the live gateway. The only
remaining step is `npm publish`, which requires an authenticated npm account/token —
that step is intentionally left for a human to run.
