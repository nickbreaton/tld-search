import { For } from "solid-js";
import { TldCard, type CatalogTld, type ToggleFavoriteEvent } from "./TldCard";

export function TldList(props: {
  tlds: CatalogTld[];
  favorites: Set<string>;
  onToggleFavorite: (name: string, event: ToggleFavoriteEvent) => void;
}) {
  return (
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
      <For each={props.tlds}>
        {(tld) => (
          <TldCard
            tld={tld}
            favorite={props.favorites.has(tld.name)}
            onToggleFavorite={(event) => props.onToggleFavorite(tld.name, event)}
          />
        )}
      </For>
    </ul>
  );
}
