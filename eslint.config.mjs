import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Note: The Next.js plugin warning is a known issue with ESLint 9 flat config.
// The plugin IS included via "next/core-web-vitals" but Next.js doesn't detect it properly.
// See: https://github.com/vercel/next.js/issues/64114
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "next.config.ts",
      "migrate-console-to-logger.js",
      ".backup/**",
      "dist/**",
      "coverage/**",
      "**/*.bak"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript - Strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "@typescript-eslint/explicit-function-return-type": "off", // Too strict for React components
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // Code Quality - Strict rules enabled
      "no-console": "error", // ✅ Phase 1.3 complete - all console calls migrated to logger
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "warn",
      "no-duplicate-imports": "error",
      "no-unused-expressions": "error",
      "eqeqeq": ["error", "always"],

      // Complexity rules - warnings for now, will refactor in Phase 3
      "complexity": ["warn", 20],
      "max-lines-per-function": ["warn", 150],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 5],

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js specific
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
