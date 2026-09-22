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
    readonly list: (options: { readonly excludeNonAscii: boolean }) => ReadonlyArray<string>;
  }
>()("tldr/server/TldCatalog") {
  static readonly layer = Layer.effect(
    TldCatalog,
    Schema.decodeUnknownEffect(Tlds)(generatedTlds).pipe(
      Effect.map((tlds) => {
        const allTlds = tlds.map((entry) => entry.tld);

        const asciiTlds = tlds
          .filter((entry) => entry.punycode === entry.tld)
          .map((entry) => entry.tld);

        return TldCatalog.of({
          list: ({ excludeNonAscii }) => (excludeNonAscii ? asciiTlds : allTlds),
        });
      }),
      Effect.orDie,
    ),
  );
}
