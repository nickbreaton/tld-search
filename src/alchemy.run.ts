import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as State from "alchemy/State";
import * as Effect from "effect/Effect";

import Worker from "./worker.ts";

export default Alchemy.Stack(
  "BookmarksJev",
  {
    providers: Cloudflare.providers(),
    state: State.localState(),
  },
  Effect.gen(function* () {
    const worker = yield* Worker;

    return { url: worker.url };
  }),
);
