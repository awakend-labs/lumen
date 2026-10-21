import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  // Next 16 adds React Compiler diagnostics. The compiler is not enabled here;
  // keep findings on these existing synchronization patterns visible without
  // changing draft timing, hydration, or third-party drag-and-drop behavior.
  {
    files: [
      "src/components/rename-dialog.tsx",
      "src/features/auth/components/auth-form.tsx",
      "src/features/profile/components/profile-settings.tsx",
      "src/features/projects/components/project-base-url-settings.tsx",
      "src/hooks/use-mobile.ts",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    files: [
      "src/features/endpoints/components/endpoint-browser.tsx",
      "src/features/endpoints/use-endpoint-draft.ts",
    ],
    rules: { "react-hooks/refs": "warn" },
  },
  { files: ["tests/**/*.cjs", "scripts/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  {
    ignores: [".next/**", ".next-performance/**", ".open-next/**", ".wrangler/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
