import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { files: ["tests/**/*.cjs", "scripts/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  {
    ignores: [".next/**", ".next-performance/**", ".open-next/**", ".wrangler/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
