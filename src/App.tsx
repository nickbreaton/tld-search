import { createMemo, isPending, latest, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";
import { createCookieSignal } from "./state/createCookieSignal";
import { createPhraseSignal } from "./state/createPhraseSignal";
import { createFavorites } from "./state/createFavorites";
import { createHeartBursts } from "./state/createHeartBursts";
import { invoke } from "@solidjs/web/server-functions";
import { Header } from "./components/Header";
import { SearchInput } from "./components/SearchInput";
import { Filters } from "./components/Filters";
import { TldList } from "./components/TldList";
import type { CatalogTld, ToggleFavoriteEvent } from "./components/TldCard";
import { HeartBursts } from "./components/HeartBursts";

const SEARCH_DEBOUNCE_MS = 150;

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

  const handleToggleFavorite = (name: string, { coords }: ToggleFavoriteEvent) => {
    if (!favorites().has(name)) {
      const rect = mainRef?.getBoundingClientRect();

      spawn(coords.x - (rect?.left ?? 0), coords.y - (rect?.top ?? 0));
    }

    toggle(name);
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

  const pending = () => isPending(debouncedPhrase) || isPending(search);
  const pendingClass = () => ({ "opacity-40 dark:opacity-33": pending() });

  return (
    <main
      ref={(el) => (mainRef = el)}
      class="relative flex flex-col max-w-4xl mx-auto mt-8 mb-6 sm:mt-16 sm:mb-15 gap-5 px-4"
    >
      <Header />
      <SearchInput
        hasValue={!!latest(() => phrase())}
        onInput={setPhrase}
        onClear={() => setPhrase("")}
      />
      <div class="mt-3 flex items-center justify-between text-sm text-taupe-400 dark:text-taupe-500">
        <span class={pendingClass()}>
          {sortedTlds().length > 500 ? "500+" : sortedTlds().length} results
        </span>
        <Filters
          latinOnly={latest(() => latinOnly())}
          onLatinOnlyChange={setLatinOnly}
          excludeCountry={latest(() => excludeCountry())}
          onExcludeCountryChange={setExcludeCountry}
        />
      </div>
      <div class={["-mt-1", pendingClass()]} inert={pending()}>
        <Show when={phrase() && search().error}>
          <p role="alert">Search failed. Please try again.</p>
        </Show>
        <TldList
          tlds={sortedTlds()}
          favorites={favorites()}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
      <HeartBursts bursts={bursts()} />
    </main>
  );
}
