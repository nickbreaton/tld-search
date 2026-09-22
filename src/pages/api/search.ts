import type { APIRoute } from "astro";
import { Effect } from "effect";

import { TldRecommender } from "../../server/RecommendTld";

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("q") ?? "";
  const excludeNonAscii = url.searchParams.get("asciiOnly") !== "false";

  return Effect.runPromise(
    Effect.gen(function* () {
      const recommender = yield* TldRecommender;

      return yield* recommender.recommend(query, excludeNonAscii);
    }).pipe(
      Effect.provide(TldRecommender.layer),
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
