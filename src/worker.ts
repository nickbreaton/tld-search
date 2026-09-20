import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

export default Cloudflare.Worker(
  "Worker",
  {
    main: import.meta.url,
    dev: { port: 3000 },
  },
  Effect.succeed({
    fetch: Effect.succeed(HttpServerResponse.text("Hello, world!")),
  }),
);
