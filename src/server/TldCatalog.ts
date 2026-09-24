import { Context, Effect, Layer, Option, Schema } from "effect";
import { domainToUnicode } from "node:url";

import dynadotTlds from "../../generated/dynadot.json";
import ianaTlds from "../../generated/iana.json";
import namecheapTlds from "../../generated/namecheap.json";
import porkbunTlds from "../../generated/porkbun.json";

const Tlds = Schema.Array(Schema.String);

type Registrar = "porkbun" | "dynadot" | "namecheap";

const IanaTlds = Schema.Array(
  Schema.Struct({
    punycode: Schema.String,
    type: Schema.Literals(["cctld", "gtld", "infrastructure"]),
  }),
);

export class TldCatalog extends Context.Service<
  TldCatalog,
  {
    readonly list: (options: {
      readonly excludeNonLatin: boolean;
      readonly excludeCountry: boolean;
    }) => ReadonlyArray<string>;
    readonly getLink: (domain: string, registrar: Registrar) => Option.Option<URL>;
  }
>()("tldr/server/TldCatalog") {
  static readonly layer = Layer.effect(
    TldCatalog,
    Effect.gen(function* () {
      const dynadot = yield* Schema.decodeUnknownEffect(Tlds)(dynadotTlds);
      const namecheap = yield* Schema.decodeUnknownEffect(Tlds)(namecheapTlds);
      const porkbun = yield* Schema.decodeUnknownEffect(Tlds)(porkbunTlds);
      const iana = yield* Schema.decodeUnknownEffect(IanaTlds)(ianaTlds);

      const registrars = {
        porkbun: new Set(porkbun.map(domainToUnicode)),
        dynadot: new Set(dynadot.map(domainToUnicode)),
        namecheap: new Set(namecheap.map(domainToUnicode)),
      };

      const rootTlds = new Set(iana.map((entry) => entry.punycode));

      const names = [...new Set([...dynadot, ...namecheap, ...porkbun])]
        .filter((name) => rootTlds.has(name))
        .sort((left, right) => left.localeCompare(right));

      const countryTlds = new Set(
        iana
          .filter((entry) => entry.type === "cctld")
          .map((entry) => domainToUnicode(entry.punycode)),
      );

      const allTlds = names.map(domainToUnicode);
      const availableTlds = new Set(allTlds);

      return TldCatalog.of({
        getLink: (domain, registrar) => {
          if (!availableTlds.has(domain) || !registrars[registrar].has(domain)) {
            return Option.none();
          }

          const base = {
            porkbun: "https://porkbun.com/tld/{domain}",
            dynadot: "https://www.dynadot.com/domain/{domain}",
            namecheap: "https://www.namecheap.com/domains/registration/gtld/{domain}/",
          }[registrar];

          const result = base.replace("{domain}", domain);

          return Schema.decodeOption(Schema.URLFromString)(result);
        },
        list: ({ excludeNonLatin, excludeCountry }) =>
          allTlds.filter(
            (name) =>
              (!excludeNonLatin || /^[\p{Script=Latin}0-9-]+$/u.test(name)) &&
              (!excludeCountry || !countryTlds.has(name)),
          ),
      });
    }).pipe(Effect.orDie),
  );
}
