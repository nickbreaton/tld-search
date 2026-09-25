import { createMemo, For, isPending, createStore, Loading, onCleanup, Show } from "solid-js";
import { getCatalog } from "./server/catalog";
import { recommend } from "./server/search";
import "./styles/global.css";
import { invoke } from "@solidjs/web/server-functions";

const SEARCH_DEBOUNCE_MS = 500

type SearchInput = Parameters<typeof recommend>[0];

export default function App() {
  const catalog = createMemo(() => getCatalog());

  const [input, setInput] = createStore<SearchInput>({
    phrase: "",
    latinOnly: true,
    excludeCountry: false,
  });

  const debouncedPhrase = createMemo(async () => {
    const { phrase } = input;

    if (!phrase) return "";

    const controller = Promise.withResolvers();
    const timeout = setTimeout(() => controller.resolve(), SEARCH_DEBOUNCE_MS);
    onCleanup(() => clearTimeout(timeout));
    await controller.promise;

    return phrase;
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
      { phrase: debouncedPhrase(), latinOnly: false, excludeCountry: false },
    )
      .then((names) => ({ names, error: false }))
      .catch(() => ({ names: [], error: true }));
  });

  const visibleTlds = createMemo(() => {
    const all = catalog();

    if (!input.phrase.trim()) return all;

    const result = search();

    if (result.error) return [];

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
          value={input.phrase}
          onInput={(event) =>
            setInput((input) => {
              input.phrase = event.currentTarget.value;
            })
          }
        />
        <Show when={isPending(search)}>Pending...</Show>
      </div>
      <label>
        <input
          type="checkbox"
          checked={input.latinOnly}
          // onChange={(event) => updateInput({ latinOnly: event.currentTarget.checked })}
        />{" "}
        Hide domain endings with non-Latin characters
      </label>
      <label>
        <input
          type="checkbox"
          checked={input.excludeCountry}
          // onChange={(event) => updateInput({ excludeCountry: event.currentTarget.checked })}
        />{" "}
        Hide country domain endings
      </label>
      <Loading fallback={<p role="status">Loading catalog…</p>}>
        <Show when={input.phrase.trim() && search().error}>
          <p role="alert">Search failed. Please try again.</p>
        </Show>
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
