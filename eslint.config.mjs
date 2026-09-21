import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      "src/generated/**",
      ".next/**",
      // The end-to-end build output — same reason as .next, different directory.
      ".next-e2e/**",
      // Where verify builds (NEXT_DIST_DIR), so it never touches a running dev server's .next.
      ".next-verify/**",
      "node_modules/**",
      "next-env.d.ts",
      // macOS writes AppleDouble sidecars on exFAT, and this project lives on one. They
      // are binary metadata with source-file names, so every tool that globs by extension
      // picks them up and reports nonsense. See DECISIONS.md PL-17.
      "**/._*",
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // Accessibility is part of "done", so these are errors rather than warnings.
      // The jsx-a11y plugin is already registered by eslint-config-next; we turn the rules
      // that matter for this product up to error rather than accepting its defaults.
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // External donation links must not leak a referrer or hand the target window access.
      "react/jsx-no-target-blank": [
        "error",
        { allowReferrer: false, enforceDynamicLinks: "always" },
      ],
    },
  },

  {
    // Brief section 9: no analytics query may bypass the aggregate layer. Admin pages talk to
    // domain modules, never to the database directly.
    files: ["src/app/(admin)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                "Admin pages must not query the database directly. Go through a domain module in src/lib/, and through src/lib/research/aggregate.ts for anything aggregate.",
            },
          ],
          patterns: [
            {
              group: ["@/generated/prisma"],
              importNames: ["PrismaClient"],
              message: "Use the shared client via a domain module, not a new PrismaClient.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
