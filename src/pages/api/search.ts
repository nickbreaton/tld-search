import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { Effect } from "effect";

import { searchTld } from "../../server/SearchTld";
import { TldCatalog } from "../../server/TldCatalog";

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("q") ?? "";

  return Effect.runPromise(
    searchTld(env.AI, query).pipe(
      Effect.provide(TldCatalog.layer),
      Effect.tapError((error) =>
        Effect.logError("TLD search request failed", {
          cause: error.cause,
          operation: error.operation,
          queryLength: query.length,
        }),
      ),
      Effect.withSpan("GET /api/search", {
        attributes: {
          "search.query.length": query.length,
        },
      }),
      Effect.match({
        onFailure: (error) => new Response(error.message, { status: query.trim() ? 502 : 400 }),
        onSuccess: (tlds) => Response.json({ tlds }),
      }),
    ),
  );
};
