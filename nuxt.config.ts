import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-23',
  modules: ['./src/module.ts'],
  typescript: {
    typeCheck: false,
    builder: 'shared',
  },
})
