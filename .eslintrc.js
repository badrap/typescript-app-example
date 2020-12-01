module.exports = {
  env: {
    node: true,
  },
  extends: ["prettier"],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "warn",
    "linebreak-style": ["error", "unix"],
    eqeqeq: ["error", "smart"],
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "prettier/@typescript-eslint",
      ],
      rules: {
        "@typescript-eslint/no-for-in-array": ["error"],
        "@typescript-eslint/explicit-member-accessibility": [
          "error",
          { accessibility: "no-public" },
        ],
        "@typescript-eslint/explicit-function-return-type": [
          "error",
          { allowExpressions: true, allowTypedFunctionExpressions: true },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            varsIgnorePattern: "^_",
            argsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
