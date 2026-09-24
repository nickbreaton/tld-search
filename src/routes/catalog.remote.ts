import { query } from "$app/server";
import { Effect, Option } from "effect";
import { TldCatalog } from "../server/TldCatalog";

export const getCatalog = query(async () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const catalog = yield* TldCatalog;
      const latin = new Set(catalog.list({ excludeNonLatin: true, excludeCountry: false }));
      const nonCountry = new Set(catalog.list({ excludeNonLatin: false, excludeCountry: true }));

      return catalog.list({ excludeNonLatin: false, excludeCountry: false }).map((name) => ({
        name,
        latin: latin.has(name),
        nonCountry: nonCountry.has(name),
        links: (["porkbun", "dynadot", "name"] as const).flatMap((registrar) => {
          const link = catalog.getLink(name, registrar);

          return Option.isSome(link) ? [{ registrar, href: link.value.href }] : [];
        }),
      }));
    }).pipe(Effect.provide(TldCatalog.layer)),
  ),
);
