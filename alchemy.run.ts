import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect } from "effect";

export const Website = Cloudflare.Website.Vite("TldSearchWebsite", {
  domain: "tld-search.nickbreaton.com",
  workersDev: false,
  env: {
    AI: Cloudflare.Workers.AI(),
  },
  observability: {
    enabled: true,
  },
});

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
  "TldSearch",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* Website;

    return {
      url: website.url,
    };
  }),
);
