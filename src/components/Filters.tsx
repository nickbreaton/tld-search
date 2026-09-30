import { createMemo, createUniqueId, Show } from "solid-js";
import chevronDownIcon from "@material-symbols/svg-400/rounded/keyboard_arrow_down.svg?raw";
import { Checkbox } from "./Checkbox";

export function Filters(props: {
  latinOnly: boolean;
  onLatinOnlyChange: (checked: boolean) => void;
  excludeCountry: boolean;
  onExcludeCountryChange: (checked: boolean) => void;
}) {
  const menuId = createUniqueId();
  const activeCount = createMemo(() => Number(props.latinOnly) + Number(props.excludeCountry));

  return (
    <>
      <button
        type="button"
        popovertarget={menuId}
        class="cursor-pointer shrink-0 inline-flex items-center gap-1.5 text-sm text-taupe-400 hover:text-taupe-500 dark:text-taupe-500 dark:hover:text-taupe-400 -m-2 p-2 touch-manipulation select-none [anchor-name:--filters-anchor]"
      >
        <span>
          Filters
          <Show when={activeCount() > 0}>
            {" "}
            <span class="tracking-wider">({activeCount()})</span>
          </Show>
        </span>
        <span
          aria-hidden="true"
          class="fill-current [&_svg]:size-5 [:has(+:popover-open)>&]:-scale-y-100"
          innerHTML={chevronDownIcon}
        />
      </button>
      <dialog
        id={menuId}
        popover
        class="m-0 open:flex max-w-80 flex-col gap-4 rounded-lg border border-solid border-taupe-200/75 bg-white p-6 text-sm text-taupe-700 shadow-sm shadow-taupe-400/20 dark:border-taupe-800 dark:bg-taupe-900 dark:text-taupe-300 dark:shadow-black/50 dark:inset-shadow-2xs dark:inset-shadow-white/5 [inset:auto] [position-anchor:--filters-anchor] [right:anchor(right)] [top:calc(anchor(bottom)_+_0.125rem)]"
      >
        <Checkbox
          checked={props.latinOnly}
          onChange={props.onLatinOnlyChange}
          label="Latin script only"
          description={
            <>
              Hide domain endings written in non-Latin characters, like{" "}
              <span class="whitespace-nowrap">.рф</span> or{" "}
              <span class="whitespace-nowrap">.中国</span>.
            </>
          }
        />
        <Checkbox
          checked={props.excludeCountry}
          onChange={props.onExcludeCountryChange}
          label="Hide country codes"
          description={
            <>
              Exclude two-letter country-code endings, like{" "}
              <span class="whitespace-nowrap">.us</span> or{" "}
              <span class="whitespace-nowrap">.de</span>.
            </>
          }
        />
      </dialog>
    </>
  );
}
