import githubIcon from "simple-icons/icons/github.svg?raw";

export function Header() {
  return (
    <div class="flex items-start justify-between gap-4">
      <h1 class="text-3xl leading-8 font-bold max-w-2xl text-balance">
        Find the perfect top-level domain for your project.
      </h1>
      <nav class="hidden sm:flex items-center gap-4 shrink-0">
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
    </div>
  );
}
