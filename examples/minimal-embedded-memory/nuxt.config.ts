import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-04-28',
  ssr: true,
  modules: ['nuxt-feathers-zod'],
  typescript: { strict: true, typeCheck: false },
  nitro: { externals: { inline: ['zod'] } },
  feathers: {
    auth: false,
    servicesDirs: ['services'],
    transports: {
      rest: { path: '/feathers', framework: 'express' },
    },
    client: { mode: 'embedded' },
  },
})
