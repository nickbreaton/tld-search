import { Context, Effect, Layer } from "effect";

import { SearchTld } from "./SearchTld";
import { TldCatalog } from "./TldCatalog";

const maximumResults = 20;

export class TldRecommender extends Context.Service<
  TldRecommender,
  {
    readonly recommend: SearchTld["Service"]["search"];
  }
>()("tldr/server/TldRecommender") {
  static readonly layerNoDeps = Layer.effect(
    TldRecommender,
    Effect.gen(function* () {
      const catalog = yield* TldCatalog;
      const searchTld = yield* SearchTld;

      const recommend = Effect.fn("TldRecommender.recommend")(function* (
        query: string,
        excludeNonLatin: boolean,
        excludeCountry: boolean,
      ) {
        const rankedTlds = yield* searchTld.search(query, excludeNonLatin, excludeCountry);

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

  static readonly layer = this.layerNoDeps.pipe(Layer.provide(SearchTld.layer));
}
