// Flat config. `next lint` was removed in Next 16, and eslint-config-next@16
// ships flat configs directly (peer: eslint >= 9), so these are composed here
// rather than resolved through the old .eslintrc mechanism.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

export default [
  {
    ignores: [
      '.next/**', 'node_modules/**', 'out/**', 'build/**',
      'clippilot/**', 'tools/**', 'supabase/functions/**', // Tauri / Python / Deno — other toolchains
      'next-env.d.ts', 'fix-netlify-handler.js', 'seed-*.js',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Unused imports are what slipped through while lint was silently dead.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none',
      }],
      // Typography only — flags apostrophes in copy. Not worth failing a build.
      'react/no-unescaped-entities': 'warn',
      // Advisory. Fires on legitimate mount-time sync (reading a cookie,
      // feature-detecting IntersectionObserver) where an effect is correct.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]
