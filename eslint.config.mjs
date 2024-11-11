import eslint from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettierRecommended,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "simple-import-sort/imports": [
        "warn",
        // Same order as the default but without newlines between groups.
        { groups: [["^\\u0000", "^node:", "^@?\\w", "^", "^\\."]] },
      ],
      "prettier/prettier": ["warn"],
      curly: ["error", "all"],
      eqeqeq: "error",
      "no-console": "warn",
      "no-multi-assign": "error",
      "no-return-assign": "error",
      "no-unused-expressions": "error",
      "no-restricted-syntax": ["error", "ForInStatement"],
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        { accessibility: "no-public" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
];
