import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import noRawJsxText from "./eslint-rules/no-raw-jsx-text.js";

const i18nPlugin = {
  rules: {
    "no-raw-jsx-text": noRawJsxText,
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
      // Wave 1: warn-level. Graduates to error in Wave 2 (toast args first), then globally in Wave 6.
      "i18n/no-raw-jsx-text": "warn",
    },
  }
);
