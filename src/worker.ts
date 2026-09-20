import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
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

const TokenResponse = Schema.Struct({
  access_token: Schema.String,
});

const UserResponse = Schema.Struct({
  data: Schema.Struct({
    username: Schema.String,
  }),
});

const decodeJevResponse = Schema.decodeUnknownEffect(JevResponse);

const decodeTokenResponse = Schema.decodeUnknownEffect(TokenResponse);

const decodeUserResponse = Schema.decodeUnknownEffect(UserResponse);

const randomBase64Url = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const sha256Base64Url = (value: string) =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))).pipe(
    Effect.map((digest) => {
      const bytes = new Uint8Array(digest);
      let binary = "";

      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }

      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    }),
  );

const requestOrigin = (request: HttpServerRequest) => {
  const host = request.headers.host ?? "localhost:3000";
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
};

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
    const xClientId = yield* Config.String("X_CLIENT_ID");
    const xClientSecret = yield* Config.Redacted("X_CLIENT_SECRET");

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;
        const url = new URL(request.url, requestOrigin(request));

        if (url.pathname === "/auth/x") {
          const state = randomBase64Url(32);
          const verifier = randomBase64Url(64);
          const challenge = yield* sha256Base64Url(verifier);
          const redirectUri = new URL("/auth/x/callback", url.origin).href;
          const authorizeUrl = new URL("https://x.com/i/oauth2/authorize");

          authorizeUrl.search = new URLSearchParams({
            response_type: "code",
            client_id: xClientId,
            redirect_uri: redirectUri,
            scope: "bookmark.read tweet.read users.read offline.access",
            state,
            code_challenge: challenge,
            code_challenge_method: "S256",
          }).toString();

          const cookieOptions = {
            httpOnly: true,
            maxAge: Duration.minutes(10),
            path: "/auth/x/callback",
            sameSite: "lax" as const,
            secure: url.protocol === "https:",
          };

          return yield* HttpServerResponse.redirect(authorizeUrl).pipe(
            HttpServerResponse.setCookie("x_oauth_state", state, cookieOptions),
            Effect.flatMap(
              HttpServerResponse.setCookie("x_oauth_verifier", verifier, cookieOptions),
            ),
          );
        }

        if (url.pathname === "/auth/x/callback") {
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const expectedState = request.cookies.x_oauth_state;
          const verifier = request.cookies.x_oauth_verifier;

          if (!code || !state || !expectedState || state !== expectedState || !verifier) {
            return yield* HttpServerResponse.json(
              { error: "Invalid OAuth callback." },
              { status: 400 },
            );
          }

          const redirectUri = new URL("/auth/x/callback", url.origin).href;
          const authorization = btoa(xClientId + ":" + Redacted.value(xClientSecret));

          const tokenHttpResponse = yield* Effect.tryPromise(() =>
            fetch("https://api.x.com/2/oauth2/token", {
              method: "POST",
              headers: {
                authorization: `Basic ${authorization}`,
                "content-type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
                code_verifier: verifier,
              }),
            }),
          );

          if (!tokenHttpResponse.ok) {
            return yield* HttpServerResponse.json(
              { error: "X token exchange failed." },
              { status: 502 },
            );
          }

          const token = yield* Effect.tryPromise(() => tokenHttpResponse.json()).pipe(
            Effect.flatMap(decodeTokenResponse),
          );

          const userHttpResponse = yield* Effect.tryPromise(() =>
            fetch("https://api.x.com/2/users/me", {
              headers: { authorization: `Bearer ${token.access_token}` },
            }),
          );

          if (!userHttpResponse.ok) {
            return yield* HttpServerResponse.json(
              { error: "Loading the X user failed." },
              { status: 502 },
            );
          }

          const user = yield* Effect.tryPromise(() => userHttpResponse.json()).pipe(
            Effect.flatMap(decodeUserResponse),
          );

          const destination = new URL("/", url.origin);

          destination.searchParams.set("username", user.data.username);

          return yield* HttpServerResponse.redirect(destination).pipe(
            HttpServerResponse.expireCookie("x_oauth_state", { path: "/auth/x/callback" }),
            Effect.flatMap(
              HttpServerResponse.expireCookie("x_oauth_verifier", {
                path: "/auth/x/callback",
              }),
            ),
          );
        }

        if (url.pathname !== "/api/search") {
          return HttpServerResponse.empty({ status: 404 });
        }

        const query = url.searchParams.get("q")?.trim();

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
      }).pipe(
        Effect.catch(() => HttpServerResponse.json({ error: "Request failed." }, { status: 500 })),
      ),
    };
  }).pipe(Effect.provide(Cloudflare.Workers.AIBinding)),
);
