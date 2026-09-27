import { createMemo, For, isPending, Loading, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";
import { createCookieSignal } from "./state/createCookieSignal";
import { createPhraseSignal } from "./state/createPhraseSignal";
import { createFavorites } from "./state/createFavorites";
import { invoke } from "@solidjs/web/server-functions";

const SEARCH_DEBOUNCE_MS = 500;

type CatalogTld = Awaited<ReturnType<typeof getCatalog>>[number];

function TldList(props: {
  tlds: CatalogTld[];
  favorites: Set<string>;
  toggle: (name: string) => void;
}) {
  return (
    <ul class="grid grid-cols-3 gap-6">
      <For each={props.tlds}>
        {(tld) => (
          <li>
            <div class="flex items-center justify-between gap-2">
              <span>.{tld.name}</span>
              <button
                type="button"
                aria-label={`${props.favorites.has(tld.name) ? "Remove" : "Add"} .${tld.name} ${props.favorites.has(tld.name) ? "from" : "to"} favorites`}
                aria-pressed={props.favorites.has(tld.name) ? "true" : "false"}
                onClick={() => props.toggle(tld.name)}
                class="cursor-pointer"
              >
                {props.favorites.has(tld.name) ? "❤️" : "♡"}
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
    <main class="flex flex-col max-w-2xl mx-auto my-5 gap-5 px-4">
      <h1 class="text-2xl font-bold">TLDR</h1>
      <p>
        Find the <strong>t</strong>op-<strong>l</strong>evel <strong>d</strong>omain that's{" "}
        <strong>r</strong>ight for your project.
      </p>
      <div>
        <input
          aria-label="Search by phrase, idea, or feeling"
          maxlength={140}
          placeholder="Search by phrase, idea, or feeling"
          class="bg-white outline-0 px-4 py-3 border border-solid border-zinc-200 w-sm max-w-full"
          onInput={(event) => setPhrase(event.currentTarget.value)}
        />
        <Show when={isPending(search)}>Pending...</Show>
      </div>
      <Loading fallback={null}>
        <label>
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
        </label>
      </Loading>
      <Loading fallback={<p role="status">Loading catalog…</p>}>
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
      </Loading>
    </main>
  );
}
