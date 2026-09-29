import { createMemo, For, isPending, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";
import { createCookieSignal } from "./state/createCookieSignal";
import { createPhraseSignal } from "./state/createPhraseSignal";
import { createFavorites } from "./state/createFavorites";
import { invoke } from "@solidjs/web/server-functions";
import favoriteIcon from "@material-symbols/svg-400/rounded/favorite.svg?raw";
import favoriteFilledIcon from "@material-symbols/svg-400/rounded/favorite-fill.svg?raw";
import arrowOutwardIcon from "@material-symbols/svg-700/rounded/arrow_outward.svg?raw";

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
    <main class="flex flex-col max-w-4xl mx-auto mt-24 mb-15 gap-5 px-4">
      <h1 class="text-3xl leading-8 font-bold max-w-2xl text-balance">
        Find the perfect&nbsp;domain&nbsp;ending for your project
      </h1>
      <div class="mt-4">
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
      <div class={["mt-10", { "opacity-50": isPending(debouncedPhrase) || isPending(search) }]}>
        <Show when={phrase() && search().error}>
          <p role="alert">Search failed. Please try again.</p>
        </Show>
        <Show when={phrase() && !search().error && visibleTlds().length === 0}>
          <p role="status">No TLDs found. Try a different search or adjust the filters.</p>
        </Show>
        <TldList tlds={sortedTlds()} favorites={favorites()} toggle={toggle} />
      </div>
    </main>
  );
}
