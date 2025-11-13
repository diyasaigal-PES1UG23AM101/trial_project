import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // === IGNORE NON-JS PATHS (replaces .eslintignore) ===
  {
    ignores: [
      "venv/",
      "app/",
      "backend/",
      "database/",
      "instance/",
      "tests/",
      "__pycache__/",
      "**/*.py",
      "node_modules/",
      "frontend/node_modules/",
      "dist/",
      "build/",
      "coverage/",
      ".tmp/",
      ".cache/",
      ".git/",
      ".DS_Store",
      "*.log",
      "*.lock",
      "*.tmp",
      "*.bak",
    ],
  },

  // === FRONTEND (React) ===
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    plugins: { react: pluginReact },
    extends: [js.configs.recommended, pluginReact.configs.flat.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    settings: {
      react: {
        version: "detect", // ✅ Fixes the React version warning
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // React 17+ doesn’t require `import React`
      "react/prop-types": "off",         // Optional: disable PropTypes requirement
    },
  },

  // === BACKEND (Node.js) ===
  {
    files: ["backend/**/*.{js,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: "latest", sourceType: "script" },
    },
  },

  // === ROOT JS FILES ===
  {
    files: ["*.js", "database/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: "latest", sourceType: "script" },
    },
  },

  // === TEST FILES (Jest / Frontend / Backend) ===
  {
    files: [
      "backend/tests/**/*.js",
      "frontend/src/**/__tests__/**/*.js",
      "frontend/src/setupTests.js",
      "tests/**/*.js",
    ],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node, ...globals.browser },
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
  },
]);