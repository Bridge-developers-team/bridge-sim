import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { applyTheme, getStoredTheme } from "./lib/theme";
import "@fontsource-variable/archivo/standard.css";
import "./styles/tokens.css";
import "./styles/components.css";

applyTheme(getStoredTheme());

// AI calls are not retried automatically: each one costs money and up to a
// minute, so the user decides (Try again / sample data).
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false }, mutations: { retry: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
