import { BunFileSystem, BunRuntime } from "@effect/platform-bun";
import { Config, Duration, Effect, FileSystem, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { XMLParser } from "fast-xml-parser";
import { fileURLToPath } from "node:url";

const apiUrl = "https://api.namecheap.com/xml.response";

const outputPath = fileURLToPath(new URL("../generated/namecheap.json", import.meta.url));

const Tld = Schema.Struct({
  "@_Name": Schema.String,
  "@_IsApiRegisterable": Schema.Literals(["true", "false"]),
});

const ApiResponse = Schema.Struct({
  ApiResponse: Schema.Struct({
    "@_Status": Schema.Literals(["OK", "ERROR"]),
    CommandResponse: Schema.optionalKey(
      Schema.Struct({ Tlds: Schema.Struct({ Tld: Schema.Array(Tld) }) }),
    ),
  }),
});

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const apiKey = yield* Config.String("NAMECHEAP_API_KEY");
  const username = yield* Config.String("NAMECHEAP_USERNAME");
  const clientIp = yield* Config.String("NAMECHEAP_CLIENT_IP");

  // The key stays in the POST body, not in a URL that might appear in error logs.
  const request = HttpClientRequest.post(apiUrl).pipe(
    HttpClientRequest.bodyUrlParams(
      new URLSearchParams({
        ApiUser: username,
        UserName: username,
        ApiKey: apiKey,
        ClientIp: clientIp,
        Command: "namecheap.domains.getTldList",
      }),
    ),
  );

  const xml = yield* httpClient.execute(request).pipe(Effect.flatMap((response) => response.text));

  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    isArray: (name) => name === "Tld",
  });

  const parsed = yield* Effect.try({
    // oxlint-disable-next-line anti-slop/no-unknown-returns -- XML is untrusted until Schema decodes it.
    try: (): unknown => parser.parse(xml),
    catch: () => new Error("Could not parse Namecheap XML response"),
  });

  const response = yield* Schema.decodeUnknownEffect(ApiResponse)(parsed);

  if (response.ApiResponse["@_Status"] !== "OK" || !response.ApiResponse.CommandResponse) {
    return yield* Effect.fail(
      new Error(
        "Namecheap API request failed. Check the API key and ensure NAMECHEAP_CLIENT_IP is whitelisted in your Namecheap account.",
      ),
    );
  }

  const tlds = response.ApiResponse.CommandResponse.Tlds.Tld.filter(
    (tld) => tld["@_IsApiRegisterable"] === "true",
  )
    .map((tld) => tld["@_Name"].toLowerCase())
    .sort((left, right) => left.localeCompare(right));

  yield* fileSystem.writeFileString(outputPath, `${JSON.stringify(tlds, null, 2)}\n`);

  yield* Effect.logInfo(`Generated ${tlds.length} Namecheap TLDs at generated/namecheap.json`);
});

program.pipe(
  Effect.provide(BunFileSystem.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.timed,
  Effect.tap(([duration]) => Effect.logInfo(`Completed in ${Duration.format(duration)}`)),
  BunRuntime.runMain,
);
