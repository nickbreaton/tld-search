import { createMemo, For, isPending, Loading, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";
import { createCookieSignal } from "./state/createCookieSignal";
import { createPhraseSignal } from "./state/createPhraseSignal";
import { createFavorites } from "./state/createFavorites";
import { invoke } from "@solidjs/web/server-functions";
import favoriteIcon from "@material-symbols/svg-400/rounded/favorite.svg?raw";
import favoriteFilledIcon from "@material-symbols/svg-400/rounded/favorite-fill.svg?raw";

const SEARCH_DEBOUNCE_MS = 150;

type CatalogTld = Awaited<ReturnType<typeof getCatalog>>[number];

function TldList(props: {
  tlds: CatalogTld[];
  favorites: Set<string>;
  toggle: (name: string) => void;
}) {
  return (
    <ul class="grid grid-cols-3 gap-2">
      <For each={props.tlds}>
        {(tld) => (
          <li class="bg-white p-4 rounded-lg border-taupe-200/75 border-solid border">
            <div class="flex items-center justify-between gap-2">
              <span>.{tld.name}</span>
              <button
                type="button"
                aria-label={`${props.favorites.has(tld.name) ? "Remove" : "Add"} .${tld.name} ${props.favorites.has(tld.name) ? "from" : "to"} favorites`}
                aria-pressed={props.favorites.has(tld.name) ? "true" : "false"}
                onClick={() => props.toggle(tld.name)}
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
            <ol>
              <For each={tld.links}>
                {(link) => (
                  <li>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="underline text-sm"
                    >
                      {link.registrar === "name" ? "name.com" : link.registrar}
                    </a>
                  </li>
                )}
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

  const favoriteTlds = createMemo(() => visibleTlds().filter((tld) => favorites().has(tld.name)));
  const otherTlds = createMemo(() => visibleTlds().filter((tld) => !favorites().has(tld.name)));

  return (
    <main class="flex flex-col max-w-4xl mx-auto my-15 gap-5 px-4">
      <h1 class="text-3xl font-bold max-w-2xl text-balance">
        Find the perfect domain ending for your project
      </h1>
      <div>
        <input
          aria-label="Search by phrase, idea, or feeling"
          maxlength={140}
          autofocus
          placeholder="Type a word, phrase, feeling, or idea"
          class="bg-white rounded-lg px-4 py-3 border border-solid border-taupe-200/75 w-md max-w-full outline-none placeholder:text-taupe-400 focus:border-taupe-400 focus:ring-4 focus:ring-taupe-200"
          onInput={(event) => setPhrase(event.currentTarget.value)}
        />
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
      <div class={isPending(debouncedPhrase) || isPending(search) ? "opacity-50" : ""}>
        <Show when={phrase() && search().error}>
          <p role="alert">Search failed. Please try again.</p>
        </Show>
        <Show when={phrase() && !search().error && visibleTlds().length === 0}>
          <p role="status">No TLDs found. Try a different search or adjust the filters.</p>
        </Show>
        <Show
          when={!phrase()}
          fallback={<TldList tlds={visibleTlds()} favorites={favorites()} toggle={toggle} />}
        >
          <Show when={favoriteTlds().length > 0}>
            <section>
              <h2 class="text-xl font-semibold mb-4">Favorites</h2>
              <TldList tlds={favoriteTlds()} favorites={favorites()} toggle={toggle} />
            </section>
          </Show>
          <section>
            <h2 class="text-xl font-semibold mb-4">Other domain endings</h2>
            <TldList tlds={otherTlds()} favorites={favorites()} toggle={toggle} />
          </section>
        </Show>
      </div>
    </main>
  );
}
