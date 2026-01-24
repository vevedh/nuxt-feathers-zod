// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-23',

  extends: [
    '@gabortorma/nuxt-eslint-layer',
  ],

  modules: [
    'nuxt-mcp',
    './src/module',
  ],

  imports: {
    autoImport: false,
  },

  feathers: {
    database: {
      mongo: {
        url: 'dummy',
      },
    },
  },

  typescript: {
    typeCheck: false,
    builder: 'shared',
    tsConfig: {
      include: [
        '../.global.d.ts',
      ],
    },
  },
})
