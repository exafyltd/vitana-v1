import { defineConfig, type PluginOption } from "vite";
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
export default defineConfig(async ({ mode }) => {
  // Bundle analysis: `ANALYZE=true npm run build` writes dist/stats.html.
  // Loaded optionally so a checkout without the (dev-only) dependency still
  // builds — the plugin is simply skipped when it isn't installed.
  let analyzer: PluginOption | undefined;
  if (process.env.ANALYZE) {
    try {
      const { visualizer } = await import("rollup-plugin-visualizer");
      analyzer = visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }) as PluginOption;
    } catch {
      console.warn("[vite] ANALYZE set but rollup-plugin-visualizer is not installed — skipping.");
    }
  }

  return {
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
      mode === "development" && componentTagger(),
      analyzer,
    ].filter(Boolean) as PluginOption[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavy, rarely-on-the-critical-path libraries out of the app
          // shell so the initial `index` chunk stays small and these only load
          // on the screens that actually use them. Each library that pulls a
          // large transitive tree gets its own long-cacheable chunk.
          manualChunks(id: string) {
            // i18n catalog: the eager de/en/ar translation shards (~4 MB of
            // JSON) were the single biggest contributor to the app-shell `index`
            // chunk. Move them into their own chunk so the entry stays small,
            // the translation blob downloads in parallel with app code, and
            // translation-only changes don't bust the app bundle (and vice
            // versa). Still eager-imported — no behaviour change, just chunking.
            if (/[\\/]src[\\/]i18n[\\/]/.test(id)) return "i18n-catalog";
            if (!id.includes("node_modules")) return undefined;
            // Heavy, screen-specific libs — only load on the screens that use them.
            if (/[\\/]node_modules[\\/](recharts|recharts-scale|d3-[^\\/]+|victory-vendor)[\\/]/.test(id)) return "charts";
            if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return "framer-motion";
            if (/[\\/]node_modules[\\/](livekit-client|@livekit)[\\/]/.test(id)) return "livekit";
            if (/[\\/]node_modules[\\/]@daily-co[\\/]/.test(id)) return "daily";
            if (/[\\/]node_modules[\\/]html2canvas[\\/]/.test(id)) return "html2canvas";
            if (/[\\/]node_modules[\\/]jspdf[\\/]/.test(id)) return "jspdf";
            if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return "firebase";
            if (/[\\/]node_modules[\\/]@stripe[\\/]/.test(id)) return "stripe";
            // Shared vendor cores — pulled out of the app shell so the entry
            // `index` chunk shrinks and these stay long-cacheable across deploys.
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react-vendor";
            if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return "radix";
            if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return "supabase";
            if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return "tanstack";
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return "icons";
            if (/[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/.test(id)) return "i18n";
            if (/[\\/]node_modules[\\/]date-fns[\\/]/.test(id)) return "date-fns";
            return undefined;
          },
        },
      },
    },
  };
});
