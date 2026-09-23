import { BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { Array as EffectArray, Duration, Effect, FileSystem, Result, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/unstable/http";
import { domainToUnicode, fileURLToPath } from "node:url";

const sourceUrl =
  "https://raw.githubusercontent.com/case/iana-data/refs/heads/main/data/generated/tlds.json";

const outputPath = fileURLToPath(new URL("../generated/tlds.json", import.meta.url));

// Delegation does not imply that the public can register names. The IANA root
// database identifies infrastructure and sponsored TLDs, but does not encode
// registration eligibility: https://www.iana.org/domains/root/db
// Google likewise operates several non-Specification 13 TLDs that it does not
// offer to registrars: https://www.registry.google/domains/
const deniedTlds = new Set([
  // Internet infrastructure and namespaces limited to qualifying institutions.
  "arpa",
  "edu",
  "gov",
  "int",
  "mil",

  // Google-operated namespaces absent from its public registration portfolio.
  "ads",
  "cal",
  "dclk",
  "docs",
  "drive",
  "eat",
  "fly",
  "gbiz",
  "gle",
  "goog",
  "guge",
  "hangout",
  "here",
  "map",
  "meet",
  "play",
  "prod",
  "search",
  "xn--qcka1pmc", // .グーグル
]);

const TldType = Schema.Literals(["cctld", "gtld", "infrastructure"]);

const SourceTld = Schema.Struct({
  tld: Schema.String,
  delegated: Schema.Boolean,
  type: TldType,
  idn: Schema.optionalKey(Schema.Array(Schema.String)),
  orgs: Schema.optionalKey(
    Schema.Struct({
      icann: Schema.optionalKey(
        Schema.Struct({
          specification_13: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
        }),
      ),
    }),
  ),
});

const Source = Schema.Struct({
  tlds: Schema.Array(SourceTld),
});

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);

  const source = yield* httpClient
    .get(sourceUrl)
    .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(Source)));

  // Delegated TLDs are active in the DNS root zone; this does not imply public registration.
  const delegatedTlds = source.tlds.filter((entry) => entry.delegated);

  // ICANN Specification 13 identifies TLDs operated as restricted brand namespaces.
  const [excludedTlds, candidateTlds] = EffectArray.partition(delegatedTlds, (entry) =>
    entry.orgs?.icann?.specification_13 === true || deniedTlds.has(entry.tld)
      ? Result.fail(entry)
      : Result.succeed(entry),
  );

  const tlds = candidateTlds
    .flatMap((entry) =>
      [entry.tld, ...(entry.idn ?? [])].map((punycode) => ({
        tld: domainToUnicode(punycode),
        punycode,
        type: entry.type,
      })),
    )
    .sort((left, right) => left.punycode.localeCompare(right.punycode));

  yield* fileSystem.writeFileString(outputPath, `${JSON.stringify(tlds, null, 2)}\n`);

  yield* Effect.logInfo(
    `Generated ${tlds.length} TLDs at generated/tlds.json; excluded ${excludedTlds.length} brand or denied TLDs`,
  );
});

program.pipe(
  Effect.provide(BunFileSystem.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.timed,
  Effect.tap(([duration]) => Effect.logInfo(`Completed in ${Duration.format(duration)}`)),
  BunRuntime.runMain,
);
