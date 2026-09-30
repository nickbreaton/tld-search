## Architecture

- Render the initial page on the server; hydrate interactive search and filters with Solid.
- Keep catalog, search, and recommendation logic in `src/server/`, using Effect for server-side domain logic.

## Tech stack

## Alchemy

This repository uses Alchemy `2.0.0` (beta) to provision and deploy resources.

Define resources in `alchemy.run.ts`. Do not add a Wrangler configuration for cloudflare.

DO NOT deploy resources unless explicitly instructed to do so. Dry runs are totally fine.

## Effect

This repository uses the Effect (v4 release candidate) TypeScript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md` completely, and follow the links in the file when required.

If you need to learn more about particular Effect APIs and concepts that the guide doesn't cover, search through the source code in `node_modules/effect/src`.

## Solid

This repository uses Solid 2.0 (release candidate).

Before writing any Solid code, first read `node_modules/solid-js/CHEATSHEET.md`.
