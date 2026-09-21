import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect } from "effect";

export const Gateway = Cloudflare.AI.Gateway("TldrGateway", {
  cacheTtl: 300,
  collectLogs: true,
});

export const Website = Cloudflare.Website.Astro("TldrWebsite", {
  env: {
    AI: Gateway,
  },
  observability: {
    enabled: true,
  },
  sessionKVBindingName: false,
});

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
  "Tldr",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const gateway = yield* Gateway;
    const website = yield* Website;

    return {
      gatewayId: gateway.gatewayId,
      url: website.url,
    };
  }),
);
