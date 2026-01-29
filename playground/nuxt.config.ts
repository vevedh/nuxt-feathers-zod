import { MongoMemoryServer } from 'mongodb-memory-server'

const mongod = await MongoMemoryServer.create()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-23',

  typescript: {
    typeCheck: false,
  },
  extends: [
    '@gabortorma/nuxt-eslint-layer',
  ],

  modules: [
    '../src/module.ts',
  ],

  feathers: {
    swagger: { enabled: true },
    servicesDirs: '../services',
    transports: {
      rest: { path: '/feathers', framework: 'express' },
    },
    database: {
      mongo: {
        url: mongod.getUri(),
      },
    },
    /* keycloak: {
      serverUrl: 'https://svrkeycloak.agglo.local:8443',
      realm: 'CACEM',
      clientId: 'nuxt4app',
      onLoad: 'login-required',
      authServicePath: '/_keycloak',
      userService: 'users',
      serviceIdField: 'keycloakId',
      permissions: false,
    }, */

    client: {
      pinia: {
        idField: 'id', // user_id for mongoDB
        services: {
          mongos: {
            idField: '_id',
          },
        },
      },
    },
  },

  hooks: {
    close: async () => {
      await mongod.stop()
    },
  },

  ssr: true,

  devtools: { enabled: false },
})
