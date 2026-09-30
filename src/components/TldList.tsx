import { For } from "solid-js";
import { TldCard, type CatalogTld, type TldCardState, type ToggleFavoriteEvent } from "./TldCard";

export function TldList(props: {
  tlds: CatalogTld[];
  cardStates: Record<string, TldCardState>;
  onToggleFavorite: (name: string, event: ToggleFavoriteEvent) => void;
}) {
  return (
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
      <For each={props.tlds}>
        {(tld) => (
          <TldCard
            tld={tld}
            hidden={props.cardStates[tld.name].hidden}
            favorite={props.cardStates[tld.name].favorite}
            onToggleFavorite={(event) => props.onToggleFavorite(tld.name, event)}
          />
        )}
      </For>
    </ul>
  );
}
