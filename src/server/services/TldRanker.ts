import { Context, Effect, Layer, Schema } from "effect";

import { JevClient, type JevQuestion } from "./JevClient";
import { TldCatalog } from "./TldCatalog";

const maximumQueryLength = 140;

const minimumProbability = 0.5;

class TldRankerError extends Schema.TaggedError<TldRankerError>()("TldRankerError", {
  cause: Schema.Defect(),
  message: Schema.String,
  operation: Schema.Literals(["inference", "validation"]),
}) {}

export class TldRanker extends Context.Service<
  TldRanker,
  {
    readonly rank: (
      query: string,
      excludeNonLatin: boolean,
      excludeCountry: boolean,
    ) => Effect.Effect<ReadonlyArray<string>, TldRankerError>;
  }
>()("tld-search/server/services/TldRanker") {
  static readonly layerNoDeps = Layer.effect(
    TldRanker,
    Effect.gen(function* () {
      const jev = yield* JevClient;
      const catalog = yield* TldCatalog;

      const rank = Effect.fn("TldRanker.rank")(function* (
        query: string,
        excludeNonLatin: boolean,
        excludeCountry: boolean,
      ) {
        const normalizedQuery = query.trim();

        if (normalizedQuery.length === 0) {
          return yield* new TldRankerError({
            cause: "The normalized query was empty.",
            message: "A search phrase is required.",
            operation: "validation",
          });
        }

        if (normalizedQuery.length > maximumQueryLength) {
          return yield* new TldRankerError({
            cause: `The normalized query exceeded ${maximumQueryLength} characters.`,
            message: `A search phrase must be ${maximumQueryLength} characters or fewer.`,
            operation: "validation",
          });
        }

        const questions: Record<string, JevQuestion> = {};

        for (const tld of catalog.list({ excludeNonLatin, excludeCountry })) {
          questions[tld] = {
            type: "noul",
            instructions: `Is the .${tld} top-level domain relevant to this phrase? Be creative.`,
          };
        }

        const answers = yield* jev.infer({ state: normalizedQuery, questions }).pipe(
          Effect.mapError(
            (cause) =>
              new TldRankerError({
                cause,
                message: "The TLD search failed.",
                operation: "inference",
              }),
          ),
        );

        const matches: Array<{ readonly probability: number; readonly tld: string }> = [];

        for (const [tld, probability] of Object.entries(answers)) {
          if (probability >= minimumProbability) {
            matches.push({ probability, tld });
          }
        }

        matches.sort((left, right) => right.probability - left.probability);

        return matches.map((match) => match.tld);
      });

      return TldRanker.of({ rank });
    }),
  );

  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide(JevClient.layerCloudflare),
    Layer.provideMerge(TldCatalog.layer),
  );
}
