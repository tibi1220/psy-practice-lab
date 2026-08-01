import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

if (!rootElement) {
  throw new Error("Unable to find the application root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={routerBase}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
