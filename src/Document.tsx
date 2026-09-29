import { Loading, type ParentProps } from "solid-js";
import { HydrationScript } from "@solidjs/web";
import googleSansUrl from "@fontsource-variable/google-sans/files/google-sans-latin-wght-normal.woff2?url";
import categorySearchIcon from "@material-symbols/svg-700/rounded/category_search.svg?url";

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>tld-search | Find the perfect top-level domain for your project</title>
        <link rel="icon" href={categorySearchIcon} type="image/svg+xml" />
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
