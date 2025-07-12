import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

/**
 * main.tsx
 * --------
 * The entry point is now super-lean:
 *   • Context providers & BrowserRouter live inside <App /> → <AppRouter />
 *   • No duplicate TeamProvider / BrowserRouter here.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
