import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
//
// Dev proxy: the production Cloud Run gateway's CORS middleware crashes (500)
// on any request that sends `Origin: http://localhost:8080`. Proxying
// /api/v1/* through the Vite dev server makes the browser see same-origin
// (no Origin header on the outbound request), which sidesteps the crash
// and matches how a proper production deploy serves frontend + API from the
// same host. Frontend code builds relative `/api/v1/...` URLs via an
// override in `.env.development.local` (VITE_GATEWAY_URL=/api/v1).
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/v1": {
        target: "https://gateway.vitanaland.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    // Modern target — the app ships to Chromium (Appilix WebView) + evergreen
    // mobile browsers, so we don't pay the transpile-to-ES5 size tax.
    target: "es2020",
    // Emit dist/.vite/manifest.json so the mobile-bundle-budget routine can
    // walk each route's chunk graph and assert a per-route weight budget.
    manifest: true,
    // The split vendor chunks below are intentionally sizeable; real per-route
    // budgets are enforced by the mobile-bundle-budget routine, not this warn.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Pull the heavy, not-needed-at-first-paint libraries out of the shared
        // vendor chunk into their own chunks. They're imported by specific
        // screens only (charts, video rooms, PDF export, payments), so this
        // keeps the initial load lean and lets the browser fetch them lazily
        // alongside the route that uses them instead of in the critical path.
        //
        // Matched by module path (not bare package name) because several of
        // these — notably firebase v12 — expose only subpath exports and have
        // no resolvable root entry for the string form of manualChunks.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/firebase/") || id.includes("/@firebase/")) return "vendor-firebase";
          if (id.includes("/recharts/")) return "vendor-charts";
          if (id.includes("/framer-motion/")) return "vendor-motion";
          if (id.includes("/@daily-co/") || id.includes("/livekit-client/")) return "vendor-video";
          if (id.includes("/jspdf/") || id.includes("/html2canvas/")) return "vendor-pdf";
          if (id.includes("/@stripe/")) return "vendor-stripe";
          if (id.includes("/@tanstack/")) return "vendor-query";
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-router") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          return undefined; // everything else stays in the default vendor chunk
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
