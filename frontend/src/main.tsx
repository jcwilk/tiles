/**
 * Tiles — React entry point
 * Minimal root component. Original main.ts kept for migration.
 */
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";

const container = document.getElementById("app");
if (!container) throw new Error("Missing #app");

createRoot(container).render(<App />);
