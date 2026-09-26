import { createMemo } from "solid-js";
import { createCookieSignal } from "./createCookieSignal";

export function createFavorites() {
  const [names, setNames] = createCookieSignal<string[]>("favorites", []);
  const favorites = createMemo(() => new Set(names()));

  const add = (name: string) => {
    if (!favorites().has(name)) setNames([...names(), name]);
  };

  const remove = (name: string) => {
    if (favorites().has(name)) setNames(names().filter((favorite) => favorite !== name));
  };

  const toggle = (name: string) => {
    if (favorites().has(name)) remove(name);
    else add(name);
  };

  return { favorites, add, remove, toggle };
}
