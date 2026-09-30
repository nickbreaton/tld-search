import { Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import checkBoxIcon from "@material-symbols/svg-600/rounded/check_box.svg?raw";
import checkBoxOutlineBlankIcon from "@material-symbols/svg-600/rounded/check_box_outline_blank.svg?raw";

export function Checkbox(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: JSX.Element;
}) {
  return (
    <label class="flex items-start gap-2 cursor-pointer select-none touch-manipulation">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
        class="sr-only peer"
      />
      <span
        aria-hidden="true"
        class={[
          "-mt-px shrink-0 rounded-xs [&_svg]:size-5",
          "peer-focus-visible:[outline:auto]",
          props.checked
            ? "fill-taupe-700 dark:fill-taupe-300"
            : "fill-taupe-400 dark:fill-taupe-500",
        ]}
        innerHTML={props.checked ? checkBoxIcon : checkBoxOutlineBlankIcon}
      />
      <span class="flex flex-col">
        <span class="text-sm leading-5 text-taupe-700 dark:text-taupe-300">{props.label}</span>
        <Show when={props.description}>
          {(description) => (
            <span class="text-xs text-taupe-400 dark:text-taupe-500">{description()}</span>
          )}
        </Show>
      </span>
    </label>
  );
}
