import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  trailingSlash: "never",
  vite: {
    plugins: [tailwindcss()],
  },
});
