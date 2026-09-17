import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-04-28',
  ssr: true,

  modules: [
    '@pinia/nuxt',
    'daisy-ui-kit/nuxt',
    'nuxt-feathers-zod',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  imports: {
    dirs: ['stores', 'composables', 'types'],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  routeRules: {
    '/dashboard': { ssr: false },
    '/admin': { ssr: false },
  },

  feathers: {
    client: {
      mode: 'embedded',
      pinia: { idField: 'id' },
    },
    servicesDirs: ['services'],
    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: false,
    },
    auth: {
      providers: {
        local: {
          type: 'local',
          usernameField: 'userId',
          passwordField: 'password',
          entityUsernameField: 'userId',
          entityPasswordField: 'password',
        },
        jwt: { type: 'jwt' },
      },
    },
    database: {
      mongo: {
        url: process.env.MONGODB_URL || 'mongodb://root:changeMe@127.0.0.1:27038/nfz_daisyui?authSource=admin',
      },
    },
    server: {
      modules: [
        {
          src: 'healthcheck',
          phase: 'pre',
          options: { path: '/api/health', payload: { status: 'ok', runtime: 'nfz' } },
        },
        {
          src: 'server/feathers/modules/seed-users.ts',
          phase: 'post',
        },
      ],
      secureDefaults: true,
      duplicateServicePolicy: 'error',
      secure: {
        cors: true,
        compression: true,
        helmet: true,
        bodyParser: {
          json: true,
          urlencoded: true,
        },
      },
    },
  },

  runtimeConfig: {
    redis: {
      enabled: process.env.REDIS_ENABLED !== 'false',
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6380/0',
      prefix: process.env.REDIS_PREFIX || 'nfz:daisyui',
      ttlSeconds: Number(process.env.REDIS_CACHE_TTL_SECONDS || 60),
    },
    demo: {
      enabled: process.env.NFZ_DEMO_ENABLED,
      user: process.env.NFZ_DEMO_USER || 'admin',
      password: process.env.NFZ_DEMO_PASSWORD || 'admin123',
      roles: process.env.NFZ_DEMO_ROLES || 'admin,member',
    },
    public: {
      appName: 'NFZ Business Portal',
      appSubtitle: 'Nuxt 4 + DaisyUiKit + Pinia + MongoDB + Redis + NFZ',
    },
  },
})
