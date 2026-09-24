import { query } from "$app/server";
import { error } from "@sveltejs/kit";
import { Effect, Schema } from "effect";

import { TldRecommender } from "../server/RecommendTld";

const SearchInput = Schema.Struct({
  phrase: Schema.String,
  latinOnly: Schema.Boolean,
  excludeCountry: Schema.Boolean,
});

export const recommend = query(
  Schema.toStandardSchemaV1(SearchInput),
  async ({ phrase, latinOnly, excludeCountry }) => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const recommender = yield* TldRecommender;

        return yield* recommender.recommend(phrase, latinOnly, excludeCountry);
      }).pipe(
        Effect.provide(TldRecommender.layer),
        Effect.tapError((cause) => Effect.logError("TLD search failed", { cause })),
        Effect.match({
          onFailure: () => ({
            success: false as const,
            message: "Search failed. Please try again.",
          }),
          onSuccess: (tlds) => ({ success: true as const, tlds }),
        }),
      ),
    );

    if (!result.success) error(400, result.message);

    return result.tlds;
  },
);
