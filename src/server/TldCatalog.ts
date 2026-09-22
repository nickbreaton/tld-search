import { Context, Effect, Layer, Schema } from "effect";

import generatedTlds from "../../generated/tlds.json";

const Tld = Schema.Struct({
  tld: Schema.String,
  punycode: Schema.String,
  type: Schema.Literals(["cctld", "gtld", "infrastructure"]),
});

const Tlds = Schema.Array(Tld);

export class TldCatalog extends Context.Service<
  TldCatalog,
  {
    readonly all: ReadonlyArray<string>;
  }
>()("tldr/server/TldCatalog") {
  static readonly layer = Layer.effect(
    TldCatalog,
    Schema.decodeUnknownEffect(Tlds)(generatedTlds).pipe(
      Effect.map((tlds) =>
        TldCatalog.of({
          all: tlds.map((entry) => entry.tld),
        }),
      ),
      Effect.orDie,
    ),
  );
}
