import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: the API runs on :8000 (uvicorn); Vite proxies /api and /healthz to it,
// so the browser sees one origin exactly like production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/healthz": "http://127.0.0.1:8000",
    },
  },
  build: {
    // pdf.js is large and only needed when someone uploads a PDF; it is
    // imported lazily, so it lands in its own chunk.
    chunkSizeWarningLimit: 1200,
  },
});
