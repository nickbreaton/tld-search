import { createMemo, type Accessor } from "solid-js";
import { seededShuffle } from "../utils/seededShuffle";

// Shuffles items in an order that stays stable for the life of the page. The seed is generated
// once per page render on the server and hydrated as-is. Its memo is async because SSR only
// serializes promise/iterable results; a sync memo would re-run on the client and cause a
// hydration mismatch.
export function createShuffled<T>(items: Accessor<readonly T[]>, key: (item: T) => string) {
  const seed = createMemo(async () => Math.floor(Math.random() * 2 ** 32), { ssrSource: "server" });

  return createMemo(() => seededShuffle(items(), seed(), key));
}
