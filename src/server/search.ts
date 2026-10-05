import { Effect, Schema } from "effect";
import { TldRecommender } from "./services/TldRecommender";

const SearchInput = Schema.Struct({
  phrase: Schema.String,
  latinOnly: Schema.Boolean,
  excludeCountry: Schema.Boolean,
});

export async function recommend(input: {
  phrase: string;
  latinOnly: boolean;
  excludeCountry: boolean;
}) {
  "use server";

  const { phrase, latinOnly, excludeCountry } = Schema.decodeUnknownSync(SearchInput)(input);

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const recommender = yield* TldRecommender;

      return yield* recommender.recommend(phrase, latinOnly, excludeCountry);
    }).pipe(
      Effect.provide(TldRecommender.layer),
      Effect.tapError((cause) => Effect.logError("TLD search failed", { cause })),
      Effect.match({
        onFailure: () => ({ success: false as const, message: "Search failed. Please try again." }),
        onSuccess: (tlds) => ({ success: true as const, tlds }),
      }),
    ),
  );

  if (!result.success) throw new Error(result.message);

  return result.tlds;
}
