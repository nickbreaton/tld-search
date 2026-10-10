// FNV-1a over the seed and value, finished with Murmur3's fmix32 so similar names spread evenly.
function hash(seed: number, value: string) {
  let h = (0x811c9dc5 ^ seed) >>> 0;

  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 0x01000193);
  }

  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return (h ^ (h >>> 16)) >>> 0;
}

// Orders items by a seeded hash of their key. Each item's position depends only on the seed and its
// own key, so any filtered subset keeps the same relative order as the full list.
export function seededShuffle<T>(items: readonly T[], seed: number, key: (item: T) => string) {
  const ranks = new Map(items.map((item) => [item, hash(seed, key(item))]));

  return items.toSorted((a, b) => ranks.get(a)! - ranks.get(b)!);
}
