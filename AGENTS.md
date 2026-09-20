Do not change this file unless explicitly instructed to.

## Product goal

Build an extremely minimal hosted application for searching a user’s X (Twitter) bookmarks by meaning rather than exact keywords. A query such as “font” should rank a bookmarked typography resource highly even when the post does not contain that exact word. Search results should render as X post embeds.

## Core experience

1. The visitor signs in exclusively with X OAuth; there is no separate account system.
2. Treat the imported archive as a contiguous, gap-free range bounded by a newest **high-water mark** and an oldest **low-water mark**. On every visit, reconcile both boundaries: fetch any bookmarks newer than the high-water mark and resume fetching older bookmarks beyond the low-water mark until the archive is complete.
3. Persist bookmarks in strict chronological order and advance a boundary only after its corresponding batch has been saved successfully. This ordered, checkpointed import makes the high- and low-water marks trustworthy after interruptions. Writes must remain idempotent and tolerate overlapping pages.
4. The search interface is a single prominent input with a minimal loading, empty, error, and sync-progress state.
5. Debounced queries use Jev to classify/rank the user’s stored bookmarks by relevance and return the best results for display as X embeds.

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
