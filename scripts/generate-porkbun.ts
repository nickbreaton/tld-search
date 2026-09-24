import { BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { Duration, Effect, FileSystem, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/unstable/http";
import { fileURLToPath } from "node:url";

const pricingUrl = "https://api.porkbun.com/api/json/v3/pricing/get";

const outputPath = fileURLToPath(new URL("../generated/porkbun.json", import.meta.url));

const Pricing = Schema.Struct({
  registration: Schema.String,
  renewal: Schema.String,
  transfer: Schema.String,
  specialType: Schema.optionalKey(Schema.Literal("handshake")),
});

const PricingResponse = Schema.Struct({
  status: Schema.Literal("SUCCESS"),
  pricing: Schema.Record(Schema.String, Pricing),
});

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);

  // Porkbun returns its complete supported registration catalog in one public request.
  const response = yield* httpClient
    .get(pricingUrl)
    .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(PricingResponse)));

  const tlds = Object.entries(response.pricing)
    .filter(([, pricing]) => pricing.specialType !== "handshake")
    .map(([tld]) => tld)
    .sort((left, right) => left.localeCompare(right));

  yield* fileSystem.writeFileString(outputPath, `${JSON.stringify(tlds, null, 2)}\n`);
  yield* Effect.logInfo(`Generated ${tlds.length} Porkbun TLDs at generated/porkbun.json`);
});

program.pipe(
  Effect.provide(BunFileSystem.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.timed,
  Effect.tap(([duration]) => Effect.logInfo(`Completed in ${Duration.format(duration)}`)),
  BunRuntime.runMain,
);
