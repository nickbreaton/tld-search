import { createMemo, createSignal } from "solid-js";

export function createPhraseSignal() {
  const [rawPhrase, setPhrase] = createSignal("");
  const phrase = createMemo(() => rawPhrase().trim());

  return { phrase, setPhrase };
}
