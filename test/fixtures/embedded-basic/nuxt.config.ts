import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

const modulePath = fileURLToPath(new URL('../../../dist/module.mjs', import.meta.url))

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
    auth: false,
    client: false,
    swagger: false,
    devtools: false,
    console: {
      enabled: true,
      allowWrite: false,
    },
    servicesDirs: ['services'],
    transports: {
      websocket: { path: '/socket.io', transports: ['websocket'] },
      rest: {
        framework: 'express',
        path: '/feathers',
      },
    },
  },
})
