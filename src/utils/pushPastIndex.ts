export function pushPastIndex<T>(
  items: readonly T[],
  index: number,
  predicate: (item: T) => boolean,
) {
  const result: T[] = [];
  const queue: { item: T; target: number }[] = [];
  let head = 0;

  items.forEach((item, i) => {
    while (head < queue.length && queue[head].target <= result.length) {
      result.push(queue[head++].item);
    }

    if (predicate(item)) queue.push({ item, target: i + index });
    else result.push(item);
  });

  while (head < queue.length) {
    result.push(queue[head++].item);
  }

  return result;
}
