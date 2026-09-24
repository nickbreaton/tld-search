import { Context, Effect, Layer, Schema } from "effect";
import { domainToUnicode } from "node:url";

import dynadotTlds from "../../generated/dynadot.json";
import namecheapTlds from "../../generated/namecheap.json";
import porkbunTlds from "../../generated/porkbun.json";

const Tlds = Schema.Array(Schema.String);

export class TldCatalog extends Context.Service<
  TldCatalog,
  {
    readonly list: (options: { readonly excludeNonAscii: boolean }) => ReadonlyArray<string>;
  }
>()("tldr/server/TldCatalog") {
  static readonly layer = Layer.effect(
    TldCatalog,
    Effect.gen(function* () {
      const dynadot = yield* Schema.decodeUnknownEffect(Tlds)(dynadotTlds);
      const namecheap = yield* Schema.decodeUnknownEffect(Tlds)(namecheapTlds);
      const porkbun = yield* Schema.decodeUnknownEffect(Tlds)(porkbunTlds);

      const names = [...new Set([...dynadot, ...namecheap, ...porkbun])].sort((left, right) =>
        left.localeCompare(right),
      );

      const allTlds = names.map(domainToUnicode);
      const asciiTlds = names.filter((name) => domainToUnicode(name) === name);

      return TldCatalog.of({
        list: ({ excludeNonAscii }) => (excludeNonAscii ? asciiTlds : allTlds),
      });
    }).pipe(Effect.orDie),
  );
}
