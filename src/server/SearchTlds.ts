import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { WebsiteEnv } from "../../alchemy.run";
import { tlds } from "./TldCatalog";

const JevResponse = Schema.Struct({
  result: Schema.Struct({
    answers: Schema.Record(
      Schema.String,
      Schema.Struct({
        type: Schema.Literal("choice"),
        choice: Schema.String,
        confidence: Schema.optionalKey(Schema.Number),
        probabilities: Schema.Record(Schema.String, Schema.Number),
      }),
    ),
  }),
  state: Schema.Literal("Completed"),
});

const decodeJevResponse = Schema.decodeUnknownEffect(JevResponse);

export class SearchError extends Schema.TaggedError<SearchError>()("SearchError", {
  message: Schema.String,
}) {}

export interface SearchResult {
  readonly description: string;
  readonly domain: string;
  readonly label: string;
  readonly relevance: number;
}

export const searchTlds = Effect.fn("searchTlds")(function* (
  ai: WebsiteEnv["AI"],
  query: string,
): Effect.fn.Return<ReadonlyArray<SearchResult>, SearchError> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length === 0) {
    return yield* new SearchError({ message: "Enter what you are making." });
  }

  if (normalizedQuery.length > 120) {
    return yield* new SearchError({ message: "Keep your search under 120 characters." });
  }

  const criteria: Record<string, string> = {};

  for (const tld of tlds) {
    criteria[tld.domain] = `${tld.label}: ${tld.description}`;
  }

  const response = yield* Effect.tryPromise({
    try: () =>
      ai.run("typesafe/jev", {
        state: { query: normalizedQuery },
        questions: {
          top_match: {
            type: "choice",
            instructions:
              "Rank the top-level domains by how well they fit the user's project, audience, and intent.",
            criteria,
          },
        },
      }),
    catch: () => new SearchError({ message: "Search is temporarily unavailable." }),
  });

  const decoded = yield* decodeJevResponse(response).pipe(
    Effect.mapError(() => new SearchError({ message: "Search returned an unexpected response." })),
  );

  const probabilities = decoded.result.answers.top_match.probabilities;

  return [...tlds]
    .map((tld) => ({
      description: tld.description,
      domain: tld.domain,
      label: tld.label,
      relevance: probabilities[tld.domain] ?? 0,
    }))
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, 8);
});
