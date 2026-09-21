/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { WebsiteEnv } from "../alchemy.run";

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: WebsiteEnv;
      };
    }
  }
}

export {};
