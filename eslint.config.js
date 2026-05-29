import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import noRawJsxText from "./eslint-rules/no-raw-jsx-text.js";
import noRawToastArg from "./eslint-rules/no-raw-toast-arg.js";
import noRawLocaleCall from "./eslint-rules/no-raw-locale-call.js";

const i18nPlugin = {
  rules: {
    "no-raw-jsx-text": noRawJsxText,
    "no-raw-toast-arg": noRawToastArg,
    "no-raw-locale-call": noRawLocaleCall,
  },
};

export default tseslint.config(
  { ignores: ["dist", "node_modules", "scripts/**"] },
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
  }
);
