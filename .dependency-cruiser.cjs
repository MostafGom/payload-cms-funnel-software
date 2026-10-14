/**
 * Module boundary rules (ADR-0001). Run with `pnpm boundaries`; CI fails on any violation.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Usually an undeclared workspace dependency (pnpm keeps them unresolvable).',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-undeclared-dependencies',
      severity: 'error',
      from: { pathNot: '^(tooling|infra)/' },
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Cycles make modules impossible to reason about or extract.',
      from: { pathNot: 'node_modules' },
      to: { circular: true },
    },
    {
      name: 'packages-never-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'apps-never-import-other-apps',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
    {
      name: 'no-deep-imports-into-workspace-packages',
      severity: 'error',
      comment:
        'Use the package entry points declared in package.json "exports", never src/ internals.',
      from: { path: '^(apps|packages)/' },
      to: { path: 'node_modules/@fp/[^/]+/src/' },
    },
    {
      name: 'platform-is-the-bottom-layer',
      severity: 'error',
      comment: 'The shared kernel depends on nothing in the workspace.',
      from: { path: '^packages/platform/' },
      to: { path: '^(packages/(?!platform/)|apps/)' },
    },
    {
      name: 'modules-do-not-import-db-or-infra-directly',
      severity: 'error',
      comment: 'Domain modules stay pure; persistence is injected via ports.',
      from: { path: '^packages/modules/' },
      to: { path: '^packages/(db|testing)/' },
    },
    {
      name: 'destinations-only-use-sdk-schemas-platform',
      severity: 'error',
      from: { path: '^packages/destinations/' },
      to: {
        path: '^packages/',
        pathNot: '^packages/(destinations-sdk|event-schemas|platform|destinations/[^/]+)/',
      },
    },
    {
      name: 'testing-only-from-tests',
      severity: 'error',
      from: { path: '^(apps|packages)/', pathNot: '\\.test\\.ts$|^packages/testing/|/perf/' },
      to: { path: '^packages/testing/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: '(^|/)(\\.next|dist|node_modules/\\.pnpm)/|payload-types\\.ts$|importMap\\.js$|next-env\\.d\\.ts$',
    },
    preserveSymlinks: false,
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs'],
    },
  },
}
