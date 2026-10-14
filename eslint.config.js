// Shared lint rules for the whole monorepo (ADR-0001). Run with `pnpm lint`; CI blocks on errors.
import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      'apps/web/public/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'apps/web/src/payload-types.ts',
      'apps/web/src/migrations/**',
      'apps/web/src/app/(payload)/**',
      'apps/web/next-env.d.ts',
      '**/*.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ['*.ts', '*.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Async correctness matters most in the collector/worker hot paths.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // PII must never be logged directly (ADR-0012): forbid logging whole request bodies.
    files: ['apps/**/*.ts', 'packages/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name=/^(info|warn|error|debug)$/] > ObjectExpression > Property[key.name=/^(body|payload|submission|contact)$/]',
          message: 'Do not log raw bodies/contacts; log ids or hashed values (ADR-0012).',
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off', // App Router only
    },
  },
  {
    files: ['packages/tracker-sdk/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // k6 load-test scripts run in the k6 runtime, not Node.
    files: ['tooling/k6/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
  },
  {
    // CLIs and scripts print to stdout by design.
    files: ['**/cli.ts', '**/scripts/**', '**/perf/**', 'tooling/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: { ...globals.node } },
  },
)
