/**
 * Tiles — React entry point
 * Minimal root component.
 */
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import { createInMemoryStorage } from "./storage.js";
import { getRouterBasename } from "./router-basename.js";

const container = document.getElementById("app");
if (!container) throw new Error("Missing #app");

const isE2E = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("e2e");
const storage = isE2E ? createInMemoryStorage() : undefined;
const basename = getRouterBasename(import.meta.env.BASE_URL);

createRoot(container).render(
  <BrowserRouter basename={basename}>
    <App storage={storage} />
  </BrowserRouter>
);
