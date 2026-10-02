import { createMemo, createProjection, isPending, latest, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";
import { createCookieSignal } from "./state/createCookieSignal";
import { createPhraseSignal } from "./state/createPhraseSignal";
import { createFavorites } from "./state/createFavorites";
import { invoke } from "@solidjs/web/server-functions";
import { Header } from "./components/Header";
import { SiteLinks } from "./components/SiteLinks";
import { SearchInput } from "./components/SearchInput";
import { Filters } from "./components/Filters";
import { TldList } from "./components/TldList";
import type { CatalogTld, TldCardState } from "./components/TldCard";

const SEARCH_DEBOUNCE_MS = 150;

export default function App() {
  const catalog = createMemo(() => getCatalog());

  const catalogByName = createMemo(() => new Map(catalog().map((tld) => [tld.name, tld])));

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

  // Matching TLDs in display order: search rank while searching, otherwise favorites first.
  const results = createMemo(() => {
    const showLatinOnly = latinOnly();
    const showNonCountryOnly = excludeCountry();

    const matches = (tld: CatalogTld | undefined): tld is CatalogTld =>
      tld != null && (!showLatinOnly || tld.latin) && (!showNonCountryOnly || tld.nonCountry);

    if (!phrase()) {
      return catalog()
        .filter(matches)
        .toSorted((a, b) => Number(favorites().has(b.name)) - Number(favorites().has(a.name)));
    }

    const result = search();

    if (result.error) return [];

    return result.names.map((name) => catalogByName().get(name)).filter(matches);
  });

  const resultNames = createMemo(() => new Set(results().map((tld) => tld.name)));

  // Every catalog entry stays mounted so filtering and favoriting only move existing cards.
  // Results lead in display order; the rest trail in catalog order and are hidden.
  const cardOrder = createMemo(() => [
    ...results(),
    ...catalog().filter((tld) => !resultNames().has(tld.name)),
  ]);

  // Keyed by TLD name so each card only re-renders when its own state changes.
  const cardStates = createProjection<Record<string, TldCardState>>((draft) => {
    for (const { name } of catalog()) {
      draft[name] ??= { hidden: true };
      draft[name].hidden = !resultNames().has(name);
    }
  }, {});

  const pending = () => isPending(debouncedPhrase) || isPending(search);
  const pendingClass = () => ({ "opacity-40 dark:opacity-33": pending() });

  return (
    <main class="relative flex flex-col min-h-dvh max-w-4xl mx-auto pt-8 pb-6 sm:pt-16 sm:pb-15 gap-5 px-4">
      <Header />
      <SearchInput
        hasValue={!!latest(() => phrase())}
        onInput={setPhrase}
        onClear={() => setPhrase("")}
      />
      <div class="mt-3 flex items-center justify-between text-sm text-taupe-400 dark:text-taupe-500">
        <span class={pendingClass()}>
          {results().length > 500 ? "500+" : results().length} results
        </span>
        <Filters
          latinOnly={latest(() => latinOnly())}
          onLatinOnlyChange={setLatinOnly}
          excludeCountry={latest(() => excludeCountry())}
          onExcludeCountryChange={setExcludeCountry}
        />
      </div>
      <div class={["-mt-1 flex-1", pendingClass()]}>
        <Show when={phrase() && search().error}>
          <p role="alert">Search failed. Please try again.</p>
        </Show>
        <TldList
          tlds={cardOrder()}
          cardStates={cardStates}
          favorites={favorites()}
          onToggleFavorite={toggle}
        />
      </div>
      <footer class="sm:hidden pt-6">
        <SiteLinks class="justify-center" />
      </footer>
    </main>
  );
}
