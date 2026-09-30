import tailwindcss from "@tailwindcss/vite";
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    solid({ start: { renderMode: "async" }, ssr: true, serverFunctions: true }),
  ],
  environments: {
    ssr: { build: { rolldownOptions: { external: ["cloudflare:workers"] } } },
  },
});
