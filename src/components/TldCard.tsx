import { For, Show } from "solid-js";
import type { getCatalog } from "../server/catalog";
import favoriteIcon from "@material-symbols/svg-400/rounded/favorite.svg?raw";
import favoriteFilledIcon from "@material-symbols/svg-400/rounded/favorite-fill.svg?raw";
import arrowOutwardIcon from "@material-symbols/svg-700/rounded/arrow_outward.svg?raw";

export type CatalogTld = Awaited<ReturnType<typeof getCatalog>>[number];

type Registrar = CatalogTld["links"][number]["registrar"];

const REGISTRARS: { id: Registrar; label: string }[] = [
  { id: "porkbun", label: "Porkbun" },
  { id: "dynadot", label: "Dynadot" },
  { id: "name", label: "Name.com" },
];

export type ToggleFavoriteEvent = { coords: { x: number; y: number } };

export function TldCard(props: {
  tld: CatalogTld;
  favorite: boolean;
  onToggleFavorite: (event: ToggleFavoriteEvent) => void;
}) {
  return (
    <li class="bg-white p-4 rounded-lg border-taupe-200/75 border-solid border">
      <div class="flex items-center justify-between gap-2">
        <span class="text-lg text-taupe-800">.{props.tld.name}</span>
        <button
          type="button"
          aria-label={`${props.favorite ? "Remove" : "Add"} .${props.tld.name} ${props.favorite ? "from" : "to"} favorites`}
          aria-pressed={props.favorite ? "true" : "false"}
          onClick={(event) =>
            props.onToggleFavorite({ coords: { x: event.clientX, y: event.clientY } })
          }
          class="cursor-pointer -m-2.5 p-2.5 touch-manipulation"
        >
          <span
            aria-hidden="true"
            class={["[&_svg]:size-6", props.favorite ? "fill-red-500" : "fill-taupe-700"]}
            innerHTML={props.favorite ? favoriteFilledIcon : favoriteIcon}
          />
        </button>
      </div>
      <hr class="my-3 border-t border-solid border-taupe-200/75" />
      <ol class="flex flex-col gap-1 select-none">
        <For each={REGISTRARS}>
          {(registrar) => (
            <Show
              when={props.tld.links.find((link) => link.registrar === registrar.id)}
              fallback={
                <li aria-hidden="true" class="order-1 text-sm">
                  &nbsp;
                </li>
              }
            >
              {(link) => (
                <li>
                  <a
                    href={link().href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Search ${registrar.label} for .${props.tld.name} domains`}
                    class="inline-flex items-center gap-1 hover:underline text-sm text-taupe-400 hover:text-taupe-500 touch-manipulation [-webkit-tap-highlight-color:--alpha(var(--color-taupe-400)/40%)]"
                  >
                    {registrar.label}
                    <span
                      aria-hidden="true"
                      class="fill-current translate-y-px [&_svg]:size-4"
                      innerHTML={arrowOutwardIcon}
                    />
                  </a>
                </li>
              )}
            </Show>
          )}
        </For>
      </ol>
    </li>
  );
}
