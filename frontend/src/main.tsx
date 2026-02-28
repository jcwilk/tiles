/**
 * Tiles — React entry point
 * Minimal root component.
 */
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import { createInMemoryStorage } from "./storage.js";

const container = document.getElementById("app");
if (!container) throw new Error("Missing #app");

const isE2E = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("e2e");
const storage = isE2E ? createInMemoryStorage() : undefined;

createRoot(container).render(
  <BrowserRouter>
    <App storage={storage} />
  </BrowserRouter>
);
