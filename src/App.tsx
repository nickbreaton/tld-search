import { createMemo, For, isPending, latest, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";
import { createCookieSignal } from "./state/createCookieSignal";
import { createPhraseSignal } from "./state/createPhraseSignal";
import { createFavorites } from "./state/createFavorites";
import { createHeartBursts } from "./state/createHeartBursts";
import { invoke } from "@solidjs/web/server-functions";
import favoriteIcon from "@material-symbols/svg-400/rounded/favorite.svg?raw";
import favoriteFilledIcon from "@material-symbols/svg-400/rounded/favorite-fill.svg?raw";
import arrowOutwardIcon from "@material-symbols/svg-700/rounded/arrow_outward.svg?raw";
import closeIcon from "@material-symbols/svg-700/rounded/close.svg?raw";
import chevronDownIcon from "@material-symbols/svg-400/rounded/keyboard_arrow_down.svg?raw";
import githubIcon from "simple-icons/icons/github.svg?raw";

const SEARCH_DEBOUNCE_MS = 150;

type CatalogTld = Awaited<ReturnType<typeof getCatalog>>[number];

type Registrar = CatalogTld["links"][number]["registrar"];

const REGISTRAR_LABELS: Record<Registrar, string> = {
  porkbun: "Porkbun",
  dynadot: "Dynadot",
  name: "Name.com",
};

// SAFETY: REGISTRAR_LABELS is a Record<Registrar, string>, so its keys are exactly the Registrar union.
const REGISTRARS = Object.keys(REGISTRAR_LABELS) as Registrar[];

function TldList(props: {
  tlds: CatalogTld[];
  favorites: Set<string>;
  toggle: (name: string) => void;
  onHeart: (x: number, y: number) => void;
}) {
  return (
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
      <For each={props.tlds}>
        {(tld) => (
          <li class="bg-white p-4 rounded-lg border-taupe-200/75 border-solid border">
            <div class="flex items-center justify-between gap-2">
              <span class="text-lg text-taupe-800">.{tld.name}</span>
              <button
                type="button"
                aria-label={`${props.favorites.has(tld.name) ? "Remove" : "Add"} .${tld.name} ${props.favorites.has(tld.name) ? "from" : "to"} favorites`}
                aria-pressed={props.favorites.has(tld.name) ? "true" : "false"}
                onClick={(event) => {
                  if (!props.favorites.has(tld.name)) {
                    props.onHeart(event.clientX, event.clientY);
                  }

                  props.toggle(tld.name);
                }}
                class="cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  class={
                    props.favorites.has(tld.name)
                      ? "fill-red-500 [&_svg]:size-6"
                      : "fill-taupe-700 [&_svg]:size-6"
                  }
                  innerHTML={props.favorites.has(tld.name) ? favoriteFilledIcon : favoriteIcon}
                />
              </button>
            </div>
            <hr class="my-3 border-t border-solid border-taupe-200/75" />
            <ol class="flex flex-col gap-1 select-none">
              <For each={REGISTRARS}>
                {(registrar) => {
                  const link = tld.links.find((link) => link.registrar === registrar);

                  return link ? (
                    <li>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Search ${REGISTRAR_LABELS[registrar]} for .${tld.name} domains`}
                        class="inline-flex items-center gap-1 hover:underline text-sm text-taupe-400 hover:text-taupe-500"
                      >
                        {REGISTRAR_LABELS[registrar]}
                        <span
                          aria-hidden="true"
                          class="fill-current translate-y-px [&_svg]:size-4"
                          innerHTML={arrowOutwardIcon}
                        />
                      </a>
                    </li>
                  ) : (
                    <li aria-hidden="true" class="order-1 text-sm">
                      &nbsp;
                    </li>
                  );
                }}
              </For>
            </ol>
          </li>
        )}
      </For>
    </ul>
  );
}

export default function App() {
  const catalog = createMemo(() => getCatalog());

  const catalogByName = createMemo(() => {
    return new Map(catalog().map((tld) => [tld.name, tld]));
  });

  const { phrase, setPhrase } = createPhraseSignal();
  const [latinOnly, setLatinOnly] = createCookieSignal<boolean>("latinOnly", true);
  const [excludeCountry, setExcludeCountry] = createCookieSignal<boolean>("excludeCountry", false);
  const { favorites, toggle } = createFavorites();
  const { bursts, spawn } = createHeartBursts();

  let mainRef: HTMLElement | undefined;
  let searchInputRef: HTMLInputElement | undefined;

  const handleHeart = (clientX: number, clientY: number) => {
    const rect = mainRef?.getBoundingClientRect();

    spawn(clientX - (rect?.left ?? 0), clientY - (rect?.top ?? 0));
  };

  const debouncedPhrase = createMemo(async () => {
    const value = phrase();

    if (!value) return "";

    const controller = Promise.withResolvers();
    const timeout = setTimeout(() => controller.resolve(), SEARCH_DEBOUNCE_MS);
    onCleanup(() => clearTimeout(timeout));
    await controller.promise;

    return value;
  });

  const search = createMemo(() => {
    if (!debouncedPhrase()) return { names: [], error: false };
    const controller = new AbortController();

    onCleanup(() => {
      controller.abort();
    });

    return invoke(
      recommend,
      { signal: controller.signal },
      { phrase: debouncedPhrase(), latinOnly: latinOnly(), excludeCountry: excludeCountry() },
    )
      .then((names) => ({ names, error: false }))
      .catch(() => ({ names: [], error: true }));
  });

  const visibleTlds = createMemo(() => {
    const all = catalog();
    const showLatinOnly = latinOnly();
    const showNonCountryOnly = excludeCountry();

    const visible = (tld: CatalogTld | undefined): tld is CatalogTld =>
      tld != null && (!showLatinOnly || tld.latin) && (!showNonCountryOnly || tld.nonCountry);

    if (!phrase()) return all.filter(visible);

    const result = search();

    if (result.error) return [];

    return result.names.map((name) => catalogByName().get(name)).filter(visible);
  });

  const sortedTlds = createMemo(() =>
    phrase()
      ? visibleTlds()
      : visibleTlds().toSorted(
          (a, b) => Number(favorites().has(b.name)) - Number(favorites().has(a.name)),
        ),
  );

  return (
    <main
      ref={(el) => (mainRef = el)}
      class="relative flex flex-col max-w-4xl mx-auto mt-4 mb-4 sm:mt-16 sm:mb-15 gap-5 px-4"
    >
      <div class="flex items-start justify-between gap-4">
        <h1 class="text-3xl leading-8 font-bold max-w-2xl text-balance">
          Find the perfect domain ending for your project.
        </h1>
        <nav class="hidden sm:flex items-center gap-4 shrink-0">
          <a
            href="https://nickbreaton.com"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-taupe-400 hover:text-taupe-500 hover:underline"
          >
            nickbreaton.com
          </a>
          <span aria-hidden="true" class="text-sm text-taupe-400 cursor-default">
            /
          </span>
          <a
            href="https://github.com/nickbreaton/tldr"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            class="text-taupe-400 hover:text-taupe-500 -m-2.5 p-2.5 inline-flex"
          >
            <span
              aria-hidden="true"
              class="fill-current [&_svg]:size-4 flex [transform:translateY(-6%)]"
              innerHTML={githubIcon}
            />
          </a>
        </nav>
      </div>
      <div class="mt-4 relative w-full sm:w-md max-w-full">
        <input
          ref={(el) => (searchInputRef = el)}
          aria-label="Search by phrase, idea, or feeling"
          maxlength={140}
          autofocus
          placeholder="Type a word, phrase, feeling, or idea"
          class="bg-white rounded-lg pl-4 pr-10 py-3 border border-solid border-taupe-200/75 w-full outline-none placeholder:text-taupe-400 focus:border-taupe-400 focus:ring-4 focus:ring-taupe-200"
          onInput={(event) => setPhrase(event.currentTarget.value)}
        />
        <Show when={latest(() => phrase())}>
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setPhrase("");

              if (searchInputRef) {
                searchInputRef.value = "";
              }

              searchInputRef?.focus();
            }}
            class="cursor-pointer absolute inset-y-0 right-0 flex items-center pr-3 text-taupe-400 hover:text-taupe-600"
          >
            <span aria-hidden="true" class=" [&_svg]:size-5 fill-current" innerHTML={closeIcon} />
          </button>
        </Show>
      </div>
      <div class="mt-3 flex items-center justify-between text-sm text-taupe-400">
        <span>{sortedTlds().length > 500 ? "500+" : sortedTlds().length} results</span>
        <button
          type="button"
          class="cursor-pointer shrink-0 inline-flex items-center gap-1.5 text-sm text-taupe-400 hover:text-taupe-500"
        >
          <span>
            Filters <span class="tracking-wider">(2)</span>
          </span>
          <span
            aria-hidden="true"
            class="fill-current [&_svg]:size-5"
            innerHTML={chevronDownIcon}
          />
        </button>
      </div>
      {/*<label>
          <input
            type="checkbox"
            checked={latinOnly()}
            onChange={(event) => setLatinOnly(event.currentTarget.checked)}
          />{" "}
          Hide domain endings with non-Latin characters
        </label>
        <label>
          <input
            type="checkbox"
            checked={excludeCountry()}
            onChange={(event) => setExcludeCountry(event.currentTarget.checked)}
          />{" "}
          Hide country domain endings
        </label>*/}
      <div class={["-mt-1", { "opacity-50": isPending(debouncedPhrase) || isPending(search) }]}>
        <Show when={phrase() && search().error}>
          <p role="alert">Search failed. Please try again.</p>
        </Show>
        <TldList
          tlds={sortedTlds()}
          favorites={favorites()}
          toggle={toggle}
          onHeart={handleHeart}
        />
      </div>
      <div class="pointer-events-none absolute inset-0 z-50 overflow-hidden">
        <For each={bursts()}>
          {(burst) => (
            <For each={burst.particles}>
              {(particle) => (
                <span
                  aria-hidden="true"
                  class="heart-burst-particle fill-red-500 absolute [&_svg]:size-full"
                  style={{
                    left: `${burst.x}px`,
                    top: `${burst.y}px`,
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                    "--heart-dx": `${particle.dx}px`,
                    "--heart-dy": `${particle.dy}px`,
                    "--heart-rotate": `${particle.rotate}deg`,
                    "animation-duration": `${particle.duration}ms`,
                    "animation-delay": `${particle.delay}ms`,
                  }}
                  innerHTML={favoriteFilledIcon}
                />
              )}
            </For>
          )}
        </For>
      </div>
    </main>
  );
}
