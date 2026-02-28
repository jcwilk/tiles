/**
 * Tiles — React entry point
 * Minimal root component. Original main.ts kept for migration.
 */
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";

const container = document.getElementById("app");
if (!container) throw new Error("Missing #app");

createRoot(container).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
