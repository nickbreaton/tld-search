import { Cookie } from "@remix-run/headers/cookie";
import { getRequestEvent, isServer } from "@solidjs/web";
import { action, createMemo, type Accessor } from "solid-js";
import { on } from "events-to-async";
import { affects } from "solid-js";

export function createCookieSignal<T extends unknown>(
  name: string,
  defaultValue: T,
): [Accessor<T>, (next: T) => void] {
  const encode = (value: T): string => JSON.stringify(value);

  const decode = (value: string | null | undefined): T =>
    value == null ? defaultValue : JSON.parse(value);

  const value = createMemo(
    async function* () {
      if (isServer) {
        yield decode(
          Cookie.from(getRequestEvent()?.request.headers.get("cookie") ?? null).get(name),
        );

        return;
      }

      const item = await window.cookieStore.get(name).catch(() => null);

      const events = on<CookieChangeEvent[]>((handler) => {
        window.cookieStore.addEventListener("change", handler);

        return () => window.cookieStore.removeEventListener("change", handler);
      });

      yield decode(item?.value);

      for await (const changes of events) {
        for (const change of changes) {
          for (const item of change.changed) {
            if (item.name === name) {
              yield decode(item.value);
            }
          }

          for (const item of change.deleted) {
            if (item.name === name) {
              yield defaultValue;
            }
          }
        }
      }
    },
    { ssrSource: "hybrid" },
  );

  return [
    value,
    action(function* (next: T) {
      affects(value);
      yield window.cookieStore.set(name, encode(next));
    }),
  ] as const;
}
