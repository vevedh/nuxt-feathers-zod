import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  devtools: { enabled: false },
  ssr: true,
  feathers: {
    auth: false,
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
