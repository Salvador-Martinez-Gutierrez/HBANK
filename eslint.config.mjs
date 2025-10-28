import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.mjs"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TypeScript - Strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],

      // Code Quality - All warnings to not block builds
      "no-console": "off", // Too many to fix now, will address in Phase 2
      "complexity": "off", // Will refactor complex functions in Phase 2
      "max-lines-per-function": "off", // Will split large functions in Phase 2
      "max-depth": "off", // Will reduce nesting in Phase 2
      "max-params": "off",

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off", // Too strict, causes false positives

      // Next.js specific
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
