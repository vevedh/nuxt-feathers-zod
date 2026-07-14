import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default [
  ...createConfigForNuxt({
    features: {
      tooling: true,
      stylistic: true,
    },
  }),

  // Relax rules for playground demo pages
  {
    files: ['app/**/*.{vue,ts,js}', 'pages/**/*.{vue,ts,js}'],
    rules: {
      // don’t block dev on formatting
      'format/prettier': 'off',

      // antfu strict style rules are great for library code, too noisy for demo UI
      'antfu/if-newline': 'off',
      'style/brace-style': 'off',
      'style/max-statements-per-line': 'off',
      'style/max-len': 'off',

      // TS style preference in demo
      'ts/consistent-type-definitions': 'off',

      // Vue style noise in demo
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'vue/comma-dangle': 'off',
    },
  },
]
