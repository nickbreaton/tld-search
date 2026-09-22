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
  static readonly layer = Layer.effect(
    TldRecommender,
    Effect.gen(function* () {
      const catalog = yield* TldCatalog;
      const searchTld = yield* SearchTld;

      const recommend = Effect.fn("TldRecommender.recommend")(function* (
        query: string,
        excludeNonAscii: boolean,
      ) {
        const rankedTlds = yield* searchTld.search(query, excludeNonAscii);

        const normalizedQuery = query.trim().toLocaleLowerCase();

        const exactMatch = catalog
          .list({ excludeNonAscii })
          .find((tld) => tld.toLocaleLowerCase() === normalizedQuery);

        const prioritizedTlds = exactMatch
          ? [exactMatch, ...rankedTlds.filter((tld) => tld !== exactMatch)]
          : rankedTlds;

        return prioritizedTlds.slice(0, maximumResults);
      });

      return TldRecommender.of({ recommend });
    }),
  ).pipe(Layer.provide(Layer.merge(TldCatalog.layer, SearchTld.layer)));
}
