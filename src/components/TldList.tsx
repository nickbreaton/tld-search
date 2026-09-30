import { For } from "solid-js";
import { TldCard, type CatalogTld } from "./TldCard";

export function TldList(props: {
  tlds: CatalogTld[];
  favorites: Set<string>;
  toggle: (name: string) => void;
  onHeart: (x: number, y: number) => void;
}) {
  return (
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
      <For each={props.tlds}>
        {(tld) => (
          <TldCard
            tld={tld}
            favorite={props.favorites.has(tld.name)}
            onToggleFavorite={() => props.toggle(tld.name)}
            onHeart={props.onHeart}
          />
        )}
      </For>
    </ul>
  );
}
