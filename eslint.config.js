import tseslint from "typescript-eslint";

const poolImportRestriction = {
  patterns: [
    {
      group: ["**/infra/db/pool", "**/infra/db/pool.ts"],
      message:
        "Import the pool (`sql`) only from within src/infra/repos or src/infra/db. Other layers should depend on a repo.",
    },
  ],
};

export default tseslint.config(
  {
    ignores: ["node_modules/**", "migrations/**", "schema/**", "sessions/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "index.ts", "scripts/**/*.ts", "tests/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", poolImportRestriction],
    },
  },
  {
    files: ["src/infra/repos/**/*.ts", "src/infra/db/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
