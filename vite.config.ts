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
        target: "https://gateway-q74ibpv6ia-uc.a.run.app",
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
}));
