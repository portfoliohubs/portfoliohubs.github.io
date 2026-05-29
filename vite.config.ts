import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

/**
 * VITE_BASE_PATH is injected automatically by the GitHub Actions deploy.yml.
 * - Local dev:      not set → defaults to "/"  → http://localhost:5173/
 * - GitHub Pages:   set to  "/<repo-name>/"    → https://username.github.io/<repo-name>/
 *
 * You never need to change this file manually.
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
  },
});
