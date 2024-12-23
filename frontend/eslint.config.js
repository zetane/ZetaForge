import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

export default [
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  {
    files: [
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
      "**/*.json",
    ],
    rules: {
      "no-control-regex": 0,
      "@typescript-eslint/no-explicit-any": ["off"],
    },
  },
  {
    ignores: [
      "core/",
      "dist/",
      "dist-electron/",
      "electron/",
      "release/",
      "utils/schema/",
    ],
  },
];
