import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import noRawJsxText from "./eslint-rules/no-raw-jsx-text.js";
import noRawToastArg from "./eslint-rules/no-raw-toast-arg.js";
import noRawLocaleCall from "./eslint-rules/no-raw-locale-call.js";
import designPlugin from "./eslint-rules/design/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

// VTID-05183 — native code reaches web code only through @vitana/core. A
// relative import is resolved against the importing file, so `../src/…`
// inside apps/mobile (its own src/) stays allowed while any path that lands
// in the repo's web src/ is reported, whatever its depth.
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const WEB_SRC = path.join(REPO_ROOT, "src") + path.sep;
const nativePlugin = {
  rules: {
    "no-web-src-import": {
      meta: {
        type: "problem",
        schema: [],
        messages: { webSrc: "reach web code only through @vitana/core (packages/core/manifest.json). \"{{spec}}\" points into the web src/ (VTID-05183)." },
      },
      create(context) {
        const file = context.physicalFilename ?? context.filename;
        const check = (node) => {
          const spec = node && node.source && node.source.value;
          if (typeof spec !== "string" || !spec.startsWith(".")) return;
          // The two web clients already get their own, more specific no-restricted-imports message.
          if (/(^|\/)integrations\/supabase\/client(\.ts)?$|(^|\/)lib\/gateway-base(\.ts)?$/.test(spec)) return;
          const target = path.resolve(path.dirname(file), spec);
          if ((target + path.sep).startsWith(WEB_SRC)) context.report({ node: node.source, messageId: "webSrc", data: { spec } });
        };
        return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check, ImportExpression: check };
      },
    },
  },
};

const i18nPlugin = {
  rules: {
    "no-raw-jsx-text": noRawJsxText,
    "no-raw-toast-arg": noRawToastArg,
    "no-raw-locale-call": noRawLocaleCall,
  },
};

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "scripts/**",
      // VTID-05157 — native app (apps/mobile): build output, generated native
      // projects, its own node_modules and the generated i18n catalog map.
      "apps/mobile/{.expo,dist,android,ios,node_modules}/**",
      "apps/mobile/src/i18n/catalog-map.generated.ts",
      // VTID-05183 — generated web extracts / tokens (gen-core-extract.mjs,
      // gen-tokens.mjs) and the core probe bundles. A global ignore, so no
      // later `files` block can lint them again.
      "packages/*/src/**/*.generated.ts",
      "apps/mobile/probe-dist/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "i18n": i18nPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // JSX text + translatable attributes: ERROR-level as of Wave 6.
      // Any new hardcoded user-visible string fails the build.
      "i18n/no-raw-jsx-text": "error",
      // toast/sonner/notify first-arg literals: ERROR-level since Wave 2.x.
      "i18n/no-raw-toast-arg": "error",
      // Date.toLocaleX / date-fns format without locale arg → English month
      // names & date layout leak into DE/ES/SR UI. Codemod cleared all 415
      // pre-existing sites on the i18n-locale-aware-dates branch; rule is now
      // ERROR-level to prevent regressions.
      "i18n/no-raw-locale-call": "error",
    },
  },
  // VTID-05157 — native app (apps/mobile, React Native / Expo). The i18n rules
  // above still apply; this block only swaps the web assumptions out. Web
  // files are not matched, so their lint result is unchanged.
  // VTID-05183 — packages/** (@vitana/core, @vitana/tokens) runs under React
  // Native too, so the same rules apply there.
  {
    files: ["apps/mobile/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        // No browser globals in React Native …
        ...Object.fromEntries(Object.keys(globals.browser).map((name) => [name, "off"])),
        // … only what the RN runtime provides.
        __DEV__: "readonly",
        global: "readonly",
        globalThis: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        queueMicrotask: "readonly",
        navigator: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
    rules: {
      "react-refresh/only-export-components": "off",
      // navigator stays allowed: React Native ships a partial one.
      "no-restricted-globals": [
        "error",
        ...["window", "document", "localStorage", "sessionStorage", "matchMedia"].map((name) => ({
          name,
          message: `"${name}" does not exist in React Native (VTID-05157). Use a native API or a storage adapter.`,
        })),
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MetaProperty",
          message: "import.meta is Vite-only; Metro has no equivalent (VTID-05157). Read config from src/config/env.ts.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/integrations/supabase/client",
              message: "The web Supabase client falls back to the production project and uses localStorage (VTID-05157). Use apps/mobile/src/config/env.ts.",
            },
            {
              name: "@/lib/gateway-base",
              message: "The web gateway base defaults to the production gateway (VTID-05157). Use apps/mobile/src/config/env.ts.",
            },
          ],
          patterns: [
            {
              regex: "(^|/)integrations/supabase/client(\\.ts)?$|(^|/)lib/gateway-base(\\.ts)?$",
              message: "The web Supabase client / gateway base reach production by default (VTID-05157). Use apps/mobile/src/config/env.ts.",
            },
          ],
        },
      ],
    },
  },
  // VTID-05183 — app code reaches web code only through @vitana/core: no `@/`
  // alias and no relative path into the web src/. `@/` stays allowed in
  // packages/core/src/*.ts (the re-export files; core-closure.mjs gates them).
  // Repeats the web-client bans because a later block replaces the options
  // of the same rule.
  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    plugins: { "vitana-native": nativePlugin },
    rules: {
      "vitana-native/no-web-src-import": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/integrations/supabase/client",
              message: "The web Supabase client falls back to the production project and uses localStorage (VTID-05157). Use apps/mobile/src/config/env.ts.",
            },
            {
              name: "@/lib/gateway-base",
              message: "The web gateway base defaults to the production gateway (VTID-05157). Use apps/mobile/src/config/env.ts.",
            },
          ],
          patterns: [
            {
              regex: "(^|/)integrations/supabase/client(\\.ts)?$|(^|/)lib/gateway-base(\\.ts)?$",
              message: "The web Supabase client / gateway base reach production by default (VTID-05157). Use apps/mobile/src/config/env.ts.",
            },
            {
              regex: "^@/",
              message: "reach web code only through @vitana/core (packages/core/manifest.json) (VTID-05183).",
            },
          ],
        },
      ],
    },
  },
  // VTID-05107 — Spotlight Design Contract (docs/design-system/SPOTLIGHT_RULES.md §C).
  // Error level from day one: existing violations are carried per file by the
  // ESLint ratchet and the base-branch `ratchet-design` PR-GATE check, so they may
  // only go down and every new file must be clean. UI primitives are exempt.
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**", "**/*.test.{ts,tsx}"],
    plugins: { design: designPlugin },
    rules: {
      "design/no-arbitrary-size": "error",
      "design/no-raw-palette": "error",
      "design/no-physical-direction": "error",
      "design/no-page-spinner": "error",
      "design/require-screen-frame": "error",
      "design/no-raw-content-card": "error",
    },
  }
);
