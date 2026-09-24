# TL;DR

TL;DR stands for “top-level domain that's right for you.” It is a SvelteKit site deployed as a Cloudflare Worker with Alchemy. Jev ranks top-level domains against a visitor's natural-language description.

## Architecture

- Keep initial pages server-rendered and hydrate interactive filters.
- Use Svelte components for the hydrated catalog and filters.
- Keep server-side domain logic in Effect; use SvelteKit remote functions for search.
- Use Effect for server-side domain logic, validation, configuration, and errors.
- Import Effect APIs from the highest-level `effect` package, such as `import { Effect, Schema } from "effect"`. Do not import from subpaths such as `effect/Effect` or `effect/Schema`.
- Provision Cloudflare resources with `alchemy.run.ts`; do not add a Wrangler configuration.
- Route Workers AI through the Alchemy-managed Cloudflare AI Gateway.
- Treat the TLD catalog as recommendations. A listed TLD is not a guarantee that a particular domain can be registered.

## Commands

- `bun run dev` — Alchemy development environment
- `bun run check` — formatting, linting, type checking, and production build
- `bun run deploy` — deploy with Alchemy

## Learning more about Effect

This repository uses the Effect TypeScript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md` completely, and follow the links in the file when required.

If you need to learn more about particular Effect APIs and concepts that the guide doesn't cover, search through the source code in `node_modules/effect/src`.
