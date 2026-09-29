import { getRequestEvent } from "@solidjs/web";

export function isMobileDevice(): boolean {
  const userAgent =
    getRequestEvent()?.request.headers.get("User-Agent") ?? navigator.userAgent ?? "";

  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
}
