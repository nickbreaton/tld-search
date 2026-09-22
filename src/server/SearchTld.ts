import { Effect, Predicate, Schema } from "effect";

import type { WebsiteEnv } from "../../alchemy.run";
import { TldCatalog } from "./TldCatalog";

const minimumProbability = 0.5;

const JevAnswers = Schema.Record(
  Schema.String,
  Schema.Struct({
    type: Schema.Literal("noul"),
    noul: Schema.Number,
  }),
);

const JevResponse = Schema.Union([
  Schema.Struct({
    answers: JevAnswers,
    model: Schema.String,
    usage: Schema.optionalKey(
      Schema.Struct({
        input_tokens: Schema.Number,
        output_tokens: Schema.Number,
      }),
    ),
  }),
  Schema.Struct({
    result: Schema.Struct({
      answers: JevAnswers,
    }),
    state: Schema.Literal("Completed"),
  }),
]);

const decodeJevResponse = Schema.decodeUnknownEffect(JevResponse);

export class SearchTldError extends Schema.TaggedError<SearchTldError>()("SearchTldError", {
  cause: Schema.Defect(),
  message: Schema.String,
  operation: Schema.Literals(["inference", "response", "validation"]),
}) {}

export const searchTld = Effect.fn("searchTld")(function* (
  ai: WebsiteEnv["AI"],
  query: string,
): Effect.fn.Return<ReadonlyArray<string>, SearchTldError, TldCatalog> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length === 0) {
    return yield* new SearchTldError({
      cause: "The normalized query was empty.",
      message: "A search phrase is required.",
      operation: "validation",
    });
  }

  const catalog = yield* TldCatalog;
  const questions: Record<string, { readonly type: "noul"; readonly instructions: string }> = {};

  for (const tld of catalog.all) {
    questions[tld] = {
      type: "noul",
      instructions: `Is the .${tld} top-level domain relevant to this phrase?`,
    };
  }

  const response = yield* Effect.tryPromise({
    try: () =>
      ai.run("typesafe/jev", {
        state: normalizedQuery,
        questions,
      }),
    catch: (cause) =>
      new SearchTldError({
        cause,
        message: "The TLD search failed.",
        operation: "inference",
      }),
  });

  const decoded = yield* decodeJevResponse(response).pipe(
    Effect.mapError(
      (cause) =>
        new SearchTldError({
          cause,
          message: "The TLD search response was invalid.",
          operation: "response",
        }),
    ),
  );

  const answers = Predicate.hasProperty(decoded, "answers")
    ? decoded.answers
    : decoded.result.answers;

  const matches: Array<{ readonly probability: number; readonly tld: string }> = [];

  for (const [tld, answer] of Object.entries(answers)) {
    if (answer.noul >= minimumProbability) {
      matches.push({ probability: answer.noul, tld });
    }
  }

  matches.sort((left, right) => right.probability - left.probability);

  return matches.map((match) => match.tld);
});
