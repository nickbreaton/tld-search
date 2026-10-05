import { Context, Effect, Layer } from "effect";

import { TldRanker } from "./TldRanker";
import { TldCatalog } from "./TldCatalog";

const maximumResults = 20;

export class TldRecommender extends Context.Service<
  TldRecommender,
  {
    readonly recommend: TldRanker["Service"]["rank"];
  }
>()("tld-search/server/services/TldRecommender") {
  static readonly layerNoDeps = Layer.effect(
    TldRecommender,
    Effect.gen(function* () {
      const catalog = yield* TldCatalog;
      const ranker = yield* TldRanker;

      const recommend = Effect.fn("TldRecommender.recommend")(function* (
        query: string,
        excludeNonLatin: boolean,
        excludeCountry: boolean,
      ) {
        const rankedTlds = yield* ranker.rank(query, excludeNonLatin, excludeCountry);

        const normalizedQuery = query.trim().toLocaleLowerCase();

        const exactMatch = catalog
          .list({ excludeNonLatin, excludeCountry })
          .find((tld) => tld.toLocaleLowerCase() === normalizedQuery);

        const prioritizedTlds = exactMatch
          ? [exactMatch, ...rankedTlds.filter((tld) => tld !== exactMatch)]
          : rankedTlds;

        return prioritizedTlds.slice(0, maximumResults);
      });

      return TldRecommender.of({ recommend });
    }),
  );

  static readonly layer = this.layerNoDeps.pipe(Layer.provide(TldRanker.layer));
}
