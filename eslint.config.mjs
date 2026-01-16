import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist/"]),
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"],
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      "simple-import-sort/imports": [
        "warn",
        // Same order as the default but without newlines between groups.
        { groups: [["^\\u0000", "^node:", "^@?\\w", "^", "^\\."]] },
      ],
      curly: ["error", "all"],
      eqeqeq: "error",
      "no-console": "warn",
      "no-multi-assign": "error",
      "no-return-assign": "error",
      "no-restricted-syntax": ["error", "ForInStatement"],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/prefer-for-of": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/consistent-generic-constructors": "off",
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
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],

      // Ensure that type-only imports can be elided when Node.js's
      // type stripping is used enabled and/or tsconfig enables
      // "verbatimModuleSyntax".
      //
      // The consistent-type-imports rule requires type-only imports to
      // be explicit.
      //
      // The no-import-type-side-effects rule disallows imports like
      // `import { type A } from "a"` that may get transpiled into empty
      // imports like `import {} from "a"`. If such an empty import is
      // actually needed (for its side-effects) then declare it explicitly
      // with `import "a"`.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
    },
  },
);
