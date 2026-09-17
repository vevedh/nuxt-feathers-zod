import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-04-28',
  modules: ['nuxt-feathers-zod'],
  feathers: {
    auth: false,
    server: { enabled: false },
    client: {
      mode: 'remote',
      remote: {
        url: process.env.NFZ_REMOTE_URL || 'http://127.0.0.1:3030',
        transport: 'rest',
        restPath: process.env.NFZ_REMOTE_REST_PATH || '/feathers',
        services: [
          { path: 'messages', methods: ['find', 'get', 'create', 'patch', 'remove'] },
        ],
      },
    },
  },
})
