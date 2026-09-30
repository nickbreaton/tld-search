import { For, Show } from "solid-js";
import type { getCatalog } from "../server/catalog";

export type CatalogTld = Awaited<ReturnType<typeof getCatalog>>[number];

type Registrar = CatalogTld["links"][number]["registrar"];

const REGISTRARS: { id: Registrar; label: string }[] = [
  { id: "porkbun", label: "Porkbun" },
  { id: "dynadot", label: "Dynadot" },
  { id: "name", label: "Name.com" },
];

export type TldCardState = { hidden: boolean; favorite: boolean };

export type ToggleFavoriteEvent = { coords: { x: number; y: number } };

export function TldCard(props: {
  tld: CatalogTld;
  hidden: boolean;
  favorite: boolean;
  onToggleFavorite: (event: ToggleFavoriteEvent) => void;
}) {
  return (
    <li
      hidden={props.hidden}
      class="bg-white p-4 rounded-lg border-taupe-200/75 border-solid border dark:bg-taupe-900/85 dark:border-taupe-800"
    >
      <div class="flex items-center justify-between gap-2">
        <span translate="no" class="notranslate text-lg text-taupe-800 dark:text-taupe-100">
          .{props.tld.name}
        </span>
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
            class={[
              "block size-6 bg-current",
              props.favorite
                ? "icon-favorite-fill text-red-500"
                : "icon-favorite text-taupe-700 dark:text-taupe-300",
            ]}
          />
        </button>
      </div>
      <hr class="my-3 border-t border-solid border-taupe-200/75 dark:border-taupe-800" />
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
                    class="inline-flex items-center gap-1 hover:underline text-sm text-taupe-400 hover:text-taupe-500 dark:text-taupe-500 dark:hover:text-taupe-400 touch-manipulation [-webkit-tap-highlight-color:--alpha(var(--color-taupe-400)/40%)] dark:[-webkit-tap-highlight-color:--alpha(var(--color-taupe-600)/40%)]"
                  >
                    {registrar.label}
                    <span
                      aria-hidden="true"
                      class="icon-arrow-outward size-4 bg-current translate-y-px"
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
