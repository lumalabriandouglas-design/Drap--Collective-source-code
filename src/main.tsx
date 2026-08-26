import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { bootTheme } from "./lib/theme";
import "./styles.css";

bootTheme();

const el = document.getElementById("root");
if (!el) throw new Error("Drapé Collective: missing root");

createRoot(el).render(
  <StrictMode>
    <RouterProvider router={getRouter()} />
  </StrictMode>,
);
