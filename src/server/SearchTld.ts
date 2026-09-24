import { Context, Effect, Layer, Schema } from "effect";

import { Jev, type JevQuestion } from "./Jev";
import { TldCatalog } from "./TldCatalog";

const maximumQueryLength = 140;

const minimumProbability = 0.5;

class SearchTldError extends Schema.TaggedError<SearchTldError>()("SearchTldError", {
  cause: Schema.Defect(),
  message: Schema.String,
  operation: Schema.Literals(["inference", "validation"]),
}) {}

export class SearchTld extends Context.Service<
  SearchTld,
  {
    readonly search: (
      query: string,
      excludeNonLatin: boolean,
    ) => Effect.Effect<ReadonlyArray<string>, SearchTldError>;
  }
>()("tldr/server/SearchTld") {
  static readonly layerNoDeps = Layer.effect(
    SearchTld,
    Effect.gen(function* () {
      const jev = yield* Jev;
      const catalog = yield* TldCatalog;

      const search = Effect.fn("SearchTld.search")(function* (
        query: string,
        excludeNonLatin: boolean,
      ) {
        const normalizedQuery = query.trim();

        if (normalizedQuery.length === 0) {
          return yield* new SearchTldError({
            cause: "The normalized query was empty.",
            message: "A search phrase is required.",
            operation: "validation",
          });
        }

        if (normalizedQuery.length > maximumQueryLength) {
          return yield* new SearchTldError({
            cause: `The normalized query exceeded ${maximumQueryLength} characters.`,
            message: `A search phrase must be ${maximumQueryLength} characters or fewer.`,
            operation: "validation",
          });
        }

        const questions: Record<string, JevQuestion> = {};

        for (const tld of catalog.list({ excludeNonLatin })) {
          questions[tld] = {
            type: "noul",
            instructions: `Is the .${tld} top-level domain relevant to this phrase? Be creative.`,
          };
        }

        const answers = yield* jev.infer({ state: normalizedQuery, questions }).pipe(
          Effect.mapError(
            (cause) =>
              new SearchTldError({
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

      return SearchTld.of({ search });
    }),
  );

  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide(Jev.layerCloudflare),
    Layer.provideMerge(TldCatalog.layer),
  );
}
