import { BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { Config, Duration, Effect, FileSystem, Option, Redacted, Schema, Stream } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { fileURLToPath } from "node:url";

const apiUrl = "https://api.dynadot.com/api3.json";

const pageSize = 100;

const outputPath = fileURLToPath(new URL("../generated/dynadot.json", import.meta.url));

const TldPriceResponse = Schema.Struct({
  TldPriceResponse: Schema.Struct({
    ResponseCode: Schema.Number,
    Status: Schema.String,
    TldPrice: Schema.optionalKey(Schema.Array(Schema.Struct({ Tld: Schema.String }))),
  }),
});

class DynadotGenerationError extends Schema.TaggedError<DynadotGenerationError>()(
  "DynadotGenerationError",
  {
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const apiKey = yield* Config.Redacted("DYNADOT_API_KEY");

  const pages = Stream.paginate(1, (page) =>
    Effect.gen(function* () {
      // Dynadot requires the key in the URL; avoid exposing it in HTTP errors.
      const request = HttpClientRequest.get(apiUrl).pipe(
        HttpClientRequest.setUrlParams({
          key: Redacted.value(apiKey),
          command: "tld_price",
          currency: "USD",
          count_per_page: String(pageSize),
          page_index: String(page),
        }),
      );

      const body = yield* httpClient.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.mapError(
          () => new DynadotGenerationError({ message: `Dynadot request failed on page ${page}` }),
        ),
      );

      const result = yield* Schema.decodeUnknownEffect(TldPriceResponse)(body);

      if (
        result.TldPriceResponse.ResponseCode !== 0 ||
        result.TldPriceResponse.Status !== "success"
      ) {
        return yield* Effect.fail(
          new DynadotGenerationError({
            message: `Dynadot API rejected page ${page}; check the API key and IP whitelist`,
          }),
        );
      }

      const entries = result.TldPriceResponse.TldPrice ?? [];

      return [
        entries.map((entry) => entry.Tld.replace(/^\./, "").toLowerCase()),
        entries.length < pageSize ? Option.none<number>() : Option.some(page + 1),
      ] as const;
    }),
  );

  const names = yield* Stream.runCollect(pages);

  if (names.length === 0)
    return yield* Effect.fail(new DynadotGenerationError({ message: "Dynadot returned no TLDs" }));

  const tlds = [...new Set(names)].sort((left, right) => left.localeCompare(right));
  yield* fileSystem.writeFileString(outputPath, `${JSON.stringify(tlds, null, 2)}\n`);

  yield* Effect.logInfo(`Generated ${tlds.length} Dynadot TLDs at generated/dynadot.json`);
});

program.pipe(
  Effect.provide(BunFileSystem.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.timed,
  Effect.tap(([duration]) => Effect.logInfo(`Completed in ${Duration.format(duration)}`)),
  BunRuntime.runMain,
);
