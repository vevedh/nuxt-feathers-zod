// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',

  extends: [
    '@gabortorma/nuxt-eslint-layer',
  ],

  modules: [
    './src/module.ts',
  ],

  imports: {
    autoImport: true,
  },

  feathers: {
    swagger: { enabled: true },
    database: {
      mongo: {
        url: 'dummy',
      },
    },
    keycloak: {
      serverUrl: 'https://svrkeycloak.agglo.local:8443',
      realm: 'AGGLO',
      clientId: 'nuxt4app',
      authServicePath: '/_keycloak',
      userService: 'users',
      serviceIdField: 'keycloakId',
      permissions: false,
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
