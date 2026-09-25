import { createMemo, createSignal, For, isPending, Loading, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";

type SearchInput = Parameters<typeof recommend>[0];

export default function App() {
  const catalog = createMemo(() => getCatalog());

  const [input, setInput] = createSignal<SearchInput>({
    phrase: "",
    latinOnly: true,
    excludeCountry: false,
  });

  const [submitted, setSubmitted] = createSignal<SearchInput | null>(null);

  let timer: ReturnType<typeof setTimeout>;
  onCleanup(() => clearTimeout(timer));

  function updateInput(changes: Partial<SearchInput>) {
    // Solid 2 commits signal writes after the event; use the new value directly.
    const next = { ...input(), ...changes };
    setInput(next);
    clearTimeout(timer);

    const phrase = next.phrase.trim();

    if (!phrase) {
      setSubmitted(null);

      return;
    }

    timer = setTimeout(() => setSubmitted({ ...next, phrase }), 150);
  }

  const search = createMemo(() => {
    const query = submitted();

    if (!query) return null;

    return recommend(query)
      .then((names) => ({ names, error: false }))
      .catch(() => ({ names: [], error: true }));
  });

  const waiting = () => {
    const { phrase, latinOnly, excludeCountry } = input();
    const query = submitted();

    return (
      !!phrase.trim() &&
      (query?.phrase !== phrase.trim() ||
        query.latinOnly !== latinOnly ||
        query.excludeCountry !== excludeCountry ||
        isPending(search))
    );
  };

  const visibleTlds = createMemo(() => {
    const { phrase, latinOnly, excludeCountry } = input();
    const all = catalog();

    if (!phrase.trim()) {
      return all.filter((tld) => (!latinOnly || tld.latin) && (!excludeCountry || tld.nonCountry));
    }

    const result = search();

    if (waiting() || !result || result.error) return [];

    const byName = new Map(all.map((tld) => [tld.name, tld]));

    return result.names.map((name) => byName.get(name)).filter((tld) => tld !== undefined);
  });

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
          value={input().phrase}
          onInput={(event) => updateInput({ phrase: event.currentTarget.value })}
        />
      </div>
      <label>
        <input
          type="checkbox"
          checked={input().latinOnly}
          onChange={(event) => updateInput({ latinOnly: event.currentTarget.checked })}
        />{" "}
        Hide domain endings with non-Latin characters
      </label>
      <label>
        <input
          type="checkbox"
          checked={input().excludeCountry}
          onChange={(event) => updateInput({ excludeCountry: event.currentTarget.checked })}
        />{" "}
        Hide country domain endings
      </label>
      <Show
        when={waiting()}
        fallback={
          <Show when={search()?.error}>
            <p role="alert">Search failed. Please try again.</p>
          </Show>
        }
      >
        <p role="status">Searching…</p>
      </Show>
      <Loading fallback={<p role="status">Loading catalog…</p>}>
        <ul class="grid grid-cols-3 gap-6">
          <For each={visibleTlds()}>
            {(tld) => (
              <li>
                .{tld.name}
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
      </Loading>
    </main>
  );
}
