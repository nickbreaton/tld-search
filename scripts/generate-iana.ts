import { BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { Duration, Effect, FileSystem, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import { domainToUnicode, fileURLToPath } from "node:url";

const sourceUrl =
  "https://raw.githubusercontent.com/case/iana-data/refs/heads/main/data/generated/tlds.json";

const outputPath = fileURLToPath(new URL("../generated/iana.json", import.meta.url));

const TldType = Schema.Literals(["cctld", "gtld", "infrastructure"]);

const SourceTld = Schema.Struct({
  tld: Schema.String,
  delegated: Schema.Boolean,
  type: TldType,
  idn: Schema.optionalKey(Schema.Array(Schema.String)),
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

  const tlds = source.tlds
    .flatMap((entry) =>
      [entry.tld, ...(entry.idn ?? [])].map((punycode) => ({
        tld: domainToUnicode(punycode),
        punycode,
        type: entry.type,
        delegated: entry.delegated,
      })),
    )
    .sort((left, right) => left.punycode.localeCompare(right.punycode));

  yield* fileSystem.writeFileString(outputPath, `${JSON.stringify(tlds, null, 2)}\n`);

  yield* Effect.logInfo(`Generated ${tlds.length} IANA TLDs at generated/iana.json`);
});

program.pipe(
  Effect.provide(BunFileSystem.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.timed,
  Effect.tap(([duration]) => Effect.logInfo(`Completed in ${Duration.format(duration)}`)),
  BunRuntime.runMain,
);
