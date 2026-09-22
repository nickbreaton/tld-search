import { Context, Layer } from "effect";
import { env } from "cloudflare:workers";

import type { WebsiteEnv } from "../../alchemy.run";

export class CloudflareAi extends Context.Service<CloudflareAi, WebsiteEnv["AI"]>()(
  "tldr/server/CloudflareAi",
) {
  static readonly layer = Layer.succeed(CloudflareAi, CloudflareAi.of(env.AI));
}
