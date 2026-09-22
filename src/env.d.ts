/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { WebsiteEnv } from "../alchemy.run";

declare global {
  namespace Cloudflare {
    interface Env extends WebsiteEnv {}
  }
}

export {};
