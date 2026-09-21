# TL;DR

TL;DR stands for “top-level domain that's right for you.” It is an Astro site deployed as a Cloudflare Worker with Alchemy. Jev ranks top-level domains against a visitor's natural-language description.

## Architecture

- Keep every page server-rendered unless a page is explicitly documented otherwise.
- Use Astro components and plain HTML/CSS. Do not add a frontend framework.
- Do not add client-side JavaScript without an explicit product requirement.
- Use Effect for server-side domain logic, validation, configuration, and errors.
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
