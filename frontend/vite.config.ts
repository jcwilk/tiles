/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves from repo root or /<repo-name>/
  base: process.env.VITE_BASE_URL ?? "/",
  server: {
    port: 5173,
    strictPort: false,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
