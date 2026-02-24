/**
 * Environment configuration for dev vs production.
 * Vite exposes env vars prefixed with VITE_ via import.meta.env.
 */

export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL ?? "http://localhost:8787";
}
