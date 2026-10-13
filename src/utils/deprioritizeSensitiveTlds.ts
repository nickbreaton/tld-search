import { pushPastIndex } from "./pushPastIndex";

// Hide sensitive TLDs from first load, they should still
// show as apart of search results.
const SENSITIVE_TLDS = new Set([
  "adult",
  "porn",
  "sex",
  "sexy",
  "xxx",
  "cam",
  "tube",
  "bet",
  "casino",
  "poker",
]);

const MIN_INDEX = 50;

export function deprioritizeSensitiveTlds<T extends { name: string }>(tlds: readonly T[]) {
  return pushPastIndex(tlds, MIN_INDEX, (tld) => SENSITIVE_TLDS.has(tld.name));
}
