import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config} */
export default {
  languageOptions: {
    globals: globals.browser,
  },
  rules: {
    "no-unused-vars": "warn",
  },
  overrides: [
    {
      name: "example/strict",
      rules: {
        "no-unused-vars": "error",
      },
    },
  ],
  ...pluginJs.configs.recommended,
};
