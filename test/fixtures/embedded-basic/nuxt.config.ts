import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

const modulePath = fileURLToPath(new URL('../../../src/module.ts', import.meta.url))

export default defineNuxtConfig({
  modules: [modulePath],
  devtools: { enabled: false },
  ssr: true,
  feathers: {
    auth: false,
    client: false,
    swagger: false,
    devtools: false,
    servicesDirs: ['services'],
    transports: {
      websocket: false,
      rest: {
        framework: 'express',
        path: '/feathers',
      },
    },
  },
})
