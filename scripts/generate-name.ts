import { BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { Config, Duration, Effect, FileSystem, Schema, Stream, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { fileURLToPath } from "node:url";

const apiUrl = "https://api.name.com/core/v1/tldpricing";

const outputPath = fileURLToPath(new URL("../generated/name.json", import.meta.url));

const PricingResponse = Schema.Struct({
  lastPage: Schema.Number,
  pricing: Schema.Array(
    Schema.Struct({
      tld: Schema.String,
      registrationPrice: Schema.NullOr(Schema.Number),
    }),
  ),
});

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const apiToken = yield* Config.String("NAME_API_TOKEN");
  const username = yield* Config.String("NAME_USERNAME");

  const pages = Stream.paginate(1, (page) =>
    Effect.gen(function* () {
      const request = HttpClientRequest.get(apiUrl).pipe(
        HttpClientRequest.setUrlParams({ page: String(page), perPage: "1000" }),
        HttpClientRequest.basicAuth(username, apiToken),
      );

      const body = yield* httpClient.execute(request).pipe(
        Effect.flatMap((response) => response.json),
        Effect.mapError(
          () =>
            new Error(
              `name.com API request failed on page ${page}; check NAME_USERNAME and NAME_API_TOKEN`,
            ),
        ),
      );

      const result = yield* Schema.decodeUnknownEffect(PricingResponse)(body);

      if (result.lastPage < page)
        return yield* Effect.fail(new Error("Invalid name.com pagination response"));

      return [
        result.pricing
          .filter((entry) => entry.registrationPrice !== null)
          .map((entry) => entry.tld.toLowerCase()),
        page < result.lastPage ? Option.some(page + 1) : Option.none<number>(),
      ] as const;
    }),
  );

  const names = yield* Stream.runCollect(pages);

  const tlds = [...new Set(names)].sort((a, b) => a.localeCompare(b));

  if (tlds.length === 0)
    return yield* Effect.fail(new Error("name.com returned no registerable TLDs"));
  yield* fileSystem.writeFileString(outputPath, `${JSON.stringify(tlds, null, 2)}\n`);
  yield* Effect.logInfo(`Generated ${tlds.length} name.com TLDs at generated/name.json`);
});

program.pipe(
  Effect.provide(BunFileSystem.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.timed,
  Effect.tap(([duration]) => Effect.logInfo(`Completed in ${Duration.format(duration)}`)),
  BunRuntime.runMain,
);
