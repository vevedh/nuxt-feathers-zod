import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

const eslintProviderCompatibility = [
  {
    name: 'nfz/eslint-provider-compat/javascript',
    files: ['**/*.?([cm])js', '**/*.?([cm])jsx', '**/*.?([cm])ts', '**/*.?([cm])tsx', '**/*.vue'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    name: 'nfz/eslint-provider-compat/typescript',
    files: ['**/*.?([cm])ts', '**/*.?([cm])tsx', '**/*.vue'],
    rules: {
      'ts/method-signature-style': ['error', 'method'],
      'ts/strict-boolean-expressions': 'off',
    },
  },
  {
    name: 'nfz/eslint-provider-compat/vue',
    files: ['**/*.vue'],
    rules: {
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        {
          registeredComponentsOnly: false,
          ignores: ['/^v-/'],
        },
      ],
      'vue/max-attributes-per-line': ['warn', {
        singleline: 100,
        multiline: 1,
      }],
    },
  },
  {
    name: 'nfz/eslint-provider-compat/style-max-len',
    files: ['**/*.?([cm])js', '**/*.?([cm])jsx', '**/*.?([cm])ts', '**/*.?([cm])tsx', '**/*.vue'],
    rules: {
      'style/max-len': ['warn', {
        code: 125,
        tabWidth: 2,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignorePattern: `^(\\s+|export\\s(default\\s)?(async\\s)?)function`,
      }],
    },
  },
]

const eslintConfig = withNuxt(
  antfu({
    ignores: [
      '.nuxt/**',
      '.output/**',
    ],
  }),
)

export default eslintConfig.append(...eslintProviderCompatibility)
