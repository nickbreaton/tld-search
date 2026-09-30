import { Show } from "solid-js";
import closeIcon from "@material-symbols/svg-700/rounded/close.svg?raw";
import { isMobileDevice } from "../utils/isMobileDevice";

export function SearchInput(props: {
  hasValue: boolean;
  onInput: (value: string) => void;
  onClear: () => void;
}) {
  let inputRef: HTMLInputElement | undefined;

  return (
    <div class="mt-4 relative w-full sm:w-md max-w-full">
      <input
        ref={(el) => (inputRef = el)}
        maxlength={140}
        autofocus={!isMobileDevice()}
        enterkeyhint="search"
        placeholder="Type a word, phrase, feeling, or idea..."
        class="bg-white rounded-lg pl-4 pr-10 py-3 border border-solid border-taupe-200/75 w-full outline-none placeholder:text-taupe-400 focus:border-taupe-400 focus:ring-4 focus:ring-taupe-200 dark:bg-taupe-900/85 dark:border-taupe-800 dark:placeholder:text-taupe-500 dark:focus:border-taupe-600 dark:focus:ring-taupe-800 touch-manipulation"
        onInput={(event) => props.onInput(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && isMobileDevice()) {
            event.currentTarget.blur();
          }
        }}
      />
      <Show when={props.hasValue}>
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            props.onClear();

            if (inputRef) {
              inputRef.value = "";
            }

            inputRef?.focus();
          }}
          class="cursor-pointer absolute inset-y-0 right-0 flex items-center pl-2 pr-3 text-taupe-400 hover:text-taupe-600 dark:text-taupe-500 dark:hover:text-taupe-300 touch-manipulation"
        >
          <span aria-hidden="true" class=" [&_svg]:size-5 fill-current" innerHTML={closeIcon} />
        </button>
      </Show>
    </div>
  );
}
