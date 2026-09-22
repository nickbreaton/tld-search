import { Context, Effect, Layer } from "effect";

import type { WebsiteEnv } from "../../alchemy.run";
import { SearchTld } from "./SearchTld";
import { TldCatalog } from "./TldCatalog";

const maximumResults = 20;

export class TldRecommender extends Context.Service<
  TldRecommender,
  {
    readonly recommend: (
      ai: WebsiteEnv["AI"],
      query: string,
    ) => ReturnType<SearchTld["Service"]["search"]>;
  }
>()("tldr/server/TldRecommender") {
  static readonly layer = Layer.effect(
    TldRecommender,
    Effect.gen(function* () {
      const catalog = yield* TldCatalog;
      const searchTld = yield* SearchTld;

      const recommend = Effect.fn("TldRecommender.recommend")(function* (
        ai: WebsiteEnv["AI"],
        query: string,
      ) {
        const rankedTlds = yield* searchTld.search(ai, query);

        const normalizedQuery = query.trim().toLocaleLowerCase();
        const exactMatch = catalog.all.find((tld) => tld.toLocaleLowerCase() === normalizedQuery);

        const prioritizedTlds = exactMatch
          ? [exactMatch, ...rankedTlds.filter((tld) => tld !== exactMatch)]
          : rankedTlds;

        return prioritizedTlds.slice(0, maximumResults);
      });

      return TldRecommender.of({ recommend });
    }),
  ).pipe(Layer.provide(Layer.merge(TldCatalog.layer, SearchTld.layer)));
}
