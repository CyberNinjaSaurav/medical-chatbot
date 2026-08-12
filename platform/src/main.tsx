import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "react-hot-toast";
import { App } from "@/app/App";
import { queryClient } from "@/app/query-client";
import "@/index.css";
import { useThemeStore } from "@/store/theme-store";

useThemeStore.getState().setTheme(useThemeStore.getState().theme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
