import githubIcon from "simple-icons/icons/github.svg?raw";

export function SiteLinks(props: { class?: string }) {
  return (
    <nav class={["flex items-center gap-4", props.class]}>
      <a
        href="https://nickbreaton.com"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-taupe-400 hover:text-taupe-500 dark:text-taupe-500 dark:hover:text-taupe-400 hover:underline touch-manipulation"
      >
        nickbreaton.com
      </a>
      <span
        aria-hidden="true"
        class="text-sm text-taupe-400 dark:text-taupe-600 cursor-default select-none"
      >
        /
      </span>
      <a
        href="https://github.com/nickbreaton/tld-search"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
        class="text-taupe-400 hover:text-taupe-500 dark:text-taupe-500 dark:hover:text-taupe-400 -m-2.5 p-2.5 inline-flex touch-manipulation"
      >
        <span
          aria-hidden="true"
          class="fill-current [&_svg]:size-4 flex [transform:translateY(-6%)]"
          innerHTML={githubIcon}
        />
      </a>
    </nav>
  );
}
