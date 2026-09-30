import type { WebsiteEnv } from "../../../alchemy.run";
import { Context, Effect, Layer, Predicate, Record as EffectRecord, Schema } from "effect";

export interface JevQuestion {
  readonly instructions: string;
  readonly type: "noul";
}

export interface JevInference {
  readonly questions: Readonly<Record<string, JevQuestion>>;
  readonly state: string;
}

const JevAnswers = Schema.Record(
  Schema.String,
  Schema.Struct({
    type: Schema.Literal("noul"),
    noul: Schema.Number,
  }),
);

const JevResponse = Schema.Union([
  Schema.Struct({
    answers: JevAnswers,
    model: Schema.String,
    usage: Schema.optionalKey(
      Schema.Struct({
        input_tokens: Schema.Number,
        output_tokens: Schema.Number,
      }),
    ),
  }),
  Schema.Struct({
    result: Schema.Struct({
      answers: JevAnswers,
    }),
    state: Schema.Literal("Completed"),
  }),
]);

const decodeJevResponse = Schema.decodeUnknownEffect(JevResponse);

export class JevError extends Schema.TaggedError<JevError>()("JevError", {
  cause: Schema.Defect(),
}) {}

export class Jev extends Context.Service<
  Jev,
  {
    readonly infer: (
      inference: JevInference,
    ) => Effect.Effect<Readonly<Record<string, number>>, JevError>;
  }
>()("tld-search/server/Jev") {
  static readonly layerCloudflare = Layer.succeed(
    Jev,
    Jev.of({
      infer: Effect.fn("Jev.infer")(function* (inference) {
        const response = yield* Effect.tryPromise({
          try: async (signal) => {
            const { env } = await import("cloudflare:workers");
            // SAFETY: Alchemy binds AI on TldSearchWebsite for every Worker request.
            const websiteEnv = env as WebsiteEnv;

            return websiteEnv.AI.run(
              "typesafe/jev",
              { ...inference },
              {
                signal,
                gateway: { id: "default" },
              },
            );
          },
          catch: (cause) => new JevError({ cause }),
        });

        const decoded = yield* decodeJevResponse(response).pipe(
          Effect.mapError((cause) => new JevError({ cause })),
        );

        const answers = Predicate.hasProperty(decoded, "answers")
          ? decoded.answers
          : decoded.result.answers;

        return EffectRecord.map(answers, (answer) => answer.noul);
      }),
    }),
  );
}
