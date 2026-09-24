import { Context, Effect, Layer, Schema } from "effect";
import { domainToUnicode } from "node:url";

import dynadotTlds from "../../generated/dynadot.json";
import ianaTlds from "../../generated/iana.json";
import namecheapTlds from "../../generated/namecheap.json";
import porkbunTlds from "../../generated/porkbun.json";

const Tlds = Schema.Array(Schema.String);

const IanaTlds = Schema.Array(Schema.Struct({ punycode: Schema.String }));

export class TldCatalog extends Context.Service<
  TldCatalog,
  {
    readonly list: (options: { readonly excludeNonLatin: boolean }) => ReadonlyArray<string>;
  }
>()("tldr/server/TldCatalog") {
  static readonly layer = Layer.effect(
    TldCatalog,
    Effect.gen(function* () {
      const dynadot = yield* Schema.decodeUnknownEffect(Tlds)(dynadotTlds);
      const namecheap = yield* Schema.decodeUnknownEffect(Tlds)(namecheapTlds);
      const porkbun = yield* Schema.decodeUnknownEffect(Tlds)(porkbunTlds);
      const iana = yield* Schema.decodeUnknownEffect(IanaTlds)(ianaTlds);

      const rootTlds = new Set(iana.map((entry) => entry.punycode));

      const names = [...new Set([...dynadot, ...namecheap, ...porkbun])]
        .filter((name) => rootTlds.has(name))
        .sort((left, right) => left.localeCompare(right));

      const allTlds = names.map(domainToUnicode);
      const latinTlds = allTlds.filter((name) => /^[\p{Script=Latin}0-9-]+$/u.test(name));

      return TldCatalog.of({
        list: ({ excludeNonLatin }) => (excludeNonLatin ? latinTlds : allTlds),
      });
    }).pipe(Effect.orDie),
  );
}
