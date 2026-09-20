import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

export default Cloudflare.Worker(
  "Worker",
  {
    main: import.meta.url,
    assets: "./public",
    dev: { port: 3000 },
  },
  Effect.succeed({
    fetch: Effect.gen(function* () {
      const request = yield* HttpServerRequest;

      if (request.url.startsWith("/api/search")) {
        return yield* HttpServerResponse.json({ ok: true });
      }

      return HttpServerResponse.empty({ status: 404 });
    }),
  }),
);
