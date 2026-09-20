import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

const JevResponse = Schema.Struct({
  result: Schema.Struct({
    answers: Schema.Struct({
      is_sandwich: Schema.Struct({
        type: Schema.Literal("noul"),
        noul: Schema.Number,
      }),
    }),
  }),
  state: Schema.Literal("Completed"),
});

const decodeJevResponse = Schema.decodeUnknownEffect(JevResponse);

const classify = (ai: Cloudflare.Workers.AIClient, food: string) =>
  Effect.gen(function* () {
    const binding = yield* ai.raw;

    const response = yield* Effect.promise(() =>
      binding.run("typesafe/jev", {
        state: food,
        questions: {
          is_sandwich: {
            type: "noul",
            instructions:
              "Is this food a sandwich? Classify the named food itself, not examples or related foods.",
            criteria: {
              true: "The food consists of a filling held between separate pieces or two distinct sides of bread.",
              false:
                "The food is not a sandwich, including foods served in a single hinged bun or folded bread.",
            },
          },
        },
      }),
    );

    const result = yield* decodeJevResponse(response);
    const probability = result.result.answers.is_sandwich.noul;

    return {
      food,
      classification: probability >= 0.5 ? "sandwich" : "not sandwich",
      probability,
    } as const;
  });

export default Cloudflare.Worker(
  "Worker",
  {
    main: import.meta.url,
    assets: "./public",
    dev: { port: 3000 },
    observability: { enabled: true },
  },
  Effect.gen(function* () {
    const ai = yield* Cloudflare.Workers.AI();

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;

        if (!request.url.startsWith("/api/search")) {
          return HttpServerResponse.empty({ status: 404 });
        }

        const query = new URL(request.url, "https://worker.local").searchParams.get("q")?.trim();

        if (!query) {
          return yield* HttpServerResponse.json(
            { error: "Enter a food to classify." },
            { status: 400 },
          );
        }

        return yield* classify(ai, query).pipe(
          Effect.flatMap(HttpServerResponse.json),
          Effect.catch(() =>
            HttpServerResponse.json({ error: "Classification failed." }, { status: 502 }),
          ),
        );
      }),
    };
  }).pipe(Effect.provide(Cloudflare.Workers.AIBinding)),
);
