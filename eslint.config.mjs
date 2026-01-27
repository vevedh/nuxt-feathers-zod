import antfu from '@gabortorma/antfu-eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(antfu({
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
  },
}))
