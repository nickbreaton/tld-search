# TL;DR

**Top-level domain that's right for you.**

TL;DR is a server-rendered Astro site that uses Jev to rank top-level domains for a natural-language query. It runs on Cloudflare Workers and is provisioned with Alchemy.

## Development

```sh
bun install
bun run dev
```

The UI uses Astro, HTML, and CSS without a client-side framework or runtime JavaScript.

## Validation

```sh
bun run check
```

## Deployment

Authenticate Alchemy with the target Cloudflare account, then run:

```sh
bun run deploy
```

Alchemy provisions the Astro Worker, Workers AI binding, and Cloudflare AI Gateway.
