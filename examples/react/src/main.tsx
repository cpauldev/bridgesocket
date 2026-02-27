import "example-ui/layout.css";
import { applyTheme, getInitialTheme } from "example-ui/theme";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "universa-ui/styles.css";

import App from "./App.tsx";

applyTheme(getInitialTheme());

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
