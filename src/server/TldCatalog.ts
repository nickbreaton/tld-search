import { TLDs } from "global-tld-list";
import { Context, Effect, Layer } from "effect";

export class TldCatalog extends Context.Service<
  TldCatalog,
  {
    readonly all: ReadonlyArray<string>;
  }
>()("tldr/server/TldCatalog") {
  static readonly layer = Layer.effect(
    TldCatalog,
    Effect.sync(() =>
      TldCatalog.of({
        all: [...TLDs.tlds.keys()],
      }),
    ),
  );
}

export const allTlds = Effect.gen(function* () {
  const catalog = yield* TldCatalog;

  return catalog.all;
});
