// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',

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
    swagger: { enabled: true },
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
