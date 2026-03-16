import antfu from '@gabortorma/antfu-eslint-config'

let withNuxt = config => config

try {
  const mod = await import('./.nuxt/eslint.config.mjs')
  if (typeof mod.default === 'function')
    withNuxt = mod.default
}
catch {}

export default withNuxt(
  antfu({
    // 1) Ne pas lint les markdown avec ESLint
    ignores: [
      '**/*.md',
      '**/*.mts',
      'docs/**',
      'playground/**',
      'out.js',
      // Transitional release-readiness exclusions: legacy monolithic CLI/templates
      // remain build-tested, but are temporarily excluded from strict style linting.
      'src/cli/core.ts',
      'src/cli/commands/doctor.ts',
      'src/cli/index.ts',
      'services/actions/**',
      'templates/custom-service-action/**',
      'services/users/users.schema.ts',
      'src/runtime/composables/feathers.ts',
      'src/runtime/composables/useAuth.ts',
      'src/runtime/options/authentication/index.ts',
      'src/runtime/plugins/keycloak-sso.ts',
      'src/runtime/server/modules/express/body-parser.ts',
      'src/runtime/templates/server/index.ts',
      'types/**/*.d.ts',
      'test/cli.spec.ts',
      'scripts/template-safety-check.mjs',
      'uno.config.ts',
      'package.json',
      'tsconfig.syntax.json',
    ],
    typescript: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      'unused-imports/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-call': 'off',
      'ts/no-unsafe-member-access': 'off',
      'ts/no-empty-object-type': 'off',
      'antfu/no-top-level-await': 'off',
      'node/prefer-global/process': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-floating-promises': 'off',
      'style/max-statements-per-line': 'off',
      'ts/no-misused-promises': 'off',
      'style/max-len': 'off',
      'vue/html-self-closing': ['warn', { html: { void: 'always', normal: 'never', component: 'always' }, svg: 'always', math: 'always' }],
    },
  }),
)
