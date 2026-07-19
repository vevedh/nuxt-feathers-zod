import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

const modulePath = fileURLToPath(new URL('../../../src/module.ts', import.meta.url))

export default defineNuxtConfig({
  modules: [modulePath],
  devtools: { enabled: false },
  ssr: true,
  nitro: {
    externals: {
      inline: ['zod'],
    },
  },
  feathers: {
    auth: {
      service: 'e2e-accounts',
      entity: 'authAccount',
      entityClass: 'AuthAccount',
    },
    client: false,
    swagger: false,
    devtools: false,
    console: {
      enabled: true,
      allowWrite: false,
      legacyNitroRoutes: false,
    },
    servicesDirs: ['auth-models'],
    transports: {
      websocket: false,
      rest: {
        framework: 'express',
        path: '/feathers',
      },
    },
    server: {
      loadOrder: ['modules:pre', 'services', 'plugins', 'modules:post'],
      plugins: ['server/register-accounts.ts', 'server/seed.ts'],
    },
  },
})
