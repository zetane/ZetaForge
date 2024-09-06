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
      "**/*.tx",
      "**/*.jsx",
      "**/*.tsx",
      "**/*.css",
      "**/*.json",
      "**/*.json5",
    ],
    rules: {
      "no-control-regex": 0,
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
