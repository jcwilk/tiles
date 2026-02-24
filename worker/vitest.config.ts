import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Prompt eval hits live worker; AI calls can take 15–30s per request
    testTimeout: process.env.PROMPT_EVAL_RECORD === "1" ? 60_000 : 5_000,
  },
});
