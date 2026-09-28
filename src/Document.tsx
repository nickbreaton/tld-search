import { Loading, type ParentProps } from "solid-js";
import { HydrationScript } from "@solidjs/web";
import googleSansUrl from "@fontsource-variable/google-sans/files/google-sans-latin-wght-normal.woff2?url";

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TLDR — find your top-level domain</title>
        <link
          rel="preload"
          href={googleSansUrl}
          as="font"
          type="font/woff2"
          crossorigin="anonymous"
        />
      </head>
      <body class="bg-taupe-50">
        <HydrationScript />
        <Loading fallback={null}>{props.children}</Loading>
      </body>
    </html>
  );
}
