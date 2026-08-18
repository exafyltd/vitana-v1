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
//
// NOTE (VTID-03255): a manualChunks vendor-splitting strategy was tried here
// and reverted — splitting interdependent vendor libs (recharts/d3 + react)
// across chunk boundaries produced a runtime "Cannot access 'X' before
// initialization" TDZ error from a cross-chunk circular dependency, white-
// screening the app. Any future code-splitting MUST be runtime-verified in a
// browser before shipping. Default (per-dynamic-import) chunking is used.
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
  // ffmpeg.wasm ships a module Web Worker (`new Worker(new URL('./worker.js',
  // import.meta.url), { type: 'module' })`). Pre-bundling it with esbuild
  // mangles that worker URL, so exclude it and let Rollup/Vite handle the
  // worker plus the self-hosted core asset emission.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        // VTID-03657 — one chunk per locale, instead of one per SHARD.
        //
        // Reported as "only English and German switch instantly". Both halves
        // had the same cause. `de` is bundled eagerly, so it is already in
        // memory. Every other locale is lazy, and `import.meta.glob` without
        // `eager` emits a separate chunk per file — 104 shards per locale, and
        // `ensureCatalog` awaits `Promise.all` over all of them before merging
        // any. So choosing Spanish fired 104 requests before one Spanish word
        // could appear; measured on a real build, es/fr/pt/ru lived only in
        // their own lazy chunks while the total build carried 1504 of them.
        //
        // English merely LOOKED instant: the intro screen's fallbacks are
        // hardcoded English (`t.intro?.welcomeTo || 'WELCOME TO VITANALAND'`),
        // so it renders identical text whether or not the `en` catalog ever
        // arrives. That coincidence is what made this read as "EN and DE work".
        //
        // Grouping by locale makes a switch ONE request.
        //
        // Why this is safe where VTID-03255's attempt was not (see the note at
        // the top of this file): that attempt split interdependent VENDOR JS —
        // recharts/d3 + react — and hit a TDZ error from a cross-chunk circular
        // import. These are JSON data modules. They import nothing, export a
        // default object, and cannot participate in an initialization cycle, so
        // the failure mode being warned about is not reachable here. The rule
        // still stands for JS: do not extend this to code without a browser check.
        manualChunks(id: string) {
          const m = /[\\/]src[\\/]i18n[\\/]([a-z]{2})[\\/][^\\/]+\.json$/.exec(id);
          // `de` is deliberately excluded: it is eagerly imported into the main
          // bundle, and naming it here would pull it OUT into a lazy chunk —
          // turning the one locale that is currently instant into a network
          // round trip. That would be a regression dressed as an optimisation.
          if (m && m[1] !== 'de') return `locale-${m[1]}`;
          return undefined;
        },
      },
    },
  },
}));
