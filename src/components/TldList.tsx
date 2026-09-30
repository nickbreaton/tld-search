import { For } from "solid-js";
import { TldCard, type CatalogTld, type TldCardState, type ToggleFavoriteEvent } from "./TldCard";

export function TldList(props: {
  tlds: CatalogTld[];
  cardStates: Record<string, TldCardState>;
  favorites: ReadonlySet<string>;
  onToggleFavorite: (name: string, event: ToggleFavoriteEvent) => void;
}) {
  // touch-action applies to every descendant, so one declaration here covers each card's links and
  // button. Setting it per element made Safari noticeably slow to focus the search input.
  return (
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2 touch-manipulation">
      <For each={props.tlds}>
        {(tld) => (
          <TldCard
            tld={tld}
            hidden={props.cardStates[tld.name].hidden}
            favorite={props.favorites.has(tld.name)}
            onToggleFavorite={(event) => props.onToggleFavorite(tld.name, event)}
          />
        )}
      </For>
    </ul>
  );
}
