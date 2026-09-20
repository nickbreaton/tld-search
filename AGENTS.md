Do not change this file unless explicitly instructed to.

## Product goal

Build an extremely minimal hosted application for searching a user’s X (Twitter) bookmarks by meaning rather than exact keywords. A query such as “font” should rank a bookmarked typography resource highly even when the post does not contain that exact word. Search results should render as X post embeds.

## Core experience

1. The visitor signs in exclusively with X OAuth; there is no separate account system.
2. Reconcile bookmarks newest-to-oldest. Begin every sync at the newest page and follow pagination backward until either the API is exhausted or a bookmark already known at the start of the sync is reached. Do not skip directly to a previously returned pagination cursor.
3. Treat pagination cursors as ephemeral traversal state, not durable archive checkpoints. Never persist or advance a cursor in a way that could cause a retry to resume behind an uncommitted gap. If traversal fails, the next sync starts from the newest page again and safely overlaps prior work.
4. Persist every fetched page idempotently, with bookmarks in strict chronological order. Only after the complete newest-to-known (or newest-to-exhaustion) traversal and all corresponding writes succeed may sync metadata advance. The committed newest bookmark ID is the stopping point for a later reconciliation; exhaustion marks the historical archive complete.
5. The search interface is a single prominent input with a minimal loading, empty, error, and sync-progress state.
6. Debounced queries use Jev to classify/rank the user’s stored bookmarks by relevance and return the best results for display as X embeds.

## Jev

Use [Jev by TypeSafe AI](https://docs.typesafe.ai/) to rank bookmarks with structured, type-safe results. Model search as a ranking/classification problem with an explicit result schema of post IDs and relevance. Respect model context limits; if an archive cannot fit, use deterministic candidate retrieval before Jev reranking.

## Technology direction

- TypeScript throughout, using **Effect TS v4 RC** for services, configuration, schemas, errors, retries, and resource management.
- **Cloudflare Workers** for the application/API and static frontend delivery.
- **Cloudflare Workers KV** for bookmark records, per-user sync metadata, and session/OAuth state unless implementation constraints require a more strongly consistent store.
- **Alchemy** (`alchemy.run`) as the preferred infrastructure-as-code/deployment approach.
- Dylan Mulroy’s **anti-slop** Oxlint rules, vendored and enforced in CI alongside formatting and type checking.
- X API v2 user-context **OAuth 2.0 Authorization Code with PKCE**, requesting only required scopes such as `bookmark.read`, `tweet.read`, `users.read`, and `offline.access` when refresh tokens are needed.

## Data access controls

Data must be isolated by authenticated X user: users may access or delete only their own bookmarks, sync state, and credentials. We will decide the storage and enforcement mechanisms during implementation.
