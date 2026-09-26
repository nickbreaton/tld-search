import { Loading, type ParentProps } from "solid-js";
import { HydrationScript } from "@solidjs/web";

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TLDR — find your top-level domain</title>
        <HydrationScript />
      </head>
      <body>
        <Loading fallback={null}>{props.children}</Loading>
      </body>
    </html>
  );
}
