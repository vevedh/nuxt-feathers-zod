import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-04-28',
  ssr: true,

  routeRules: {
    '/dashboard': { ssr: false },
    '/messages': { ssr: false },
    '/session': { ssr: false },
  },

  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    'nuxt-quasar-ui',
    'nuxt-feathers-zod',
  ],

  css: [
    '@quasar/extras/material-icons/material-icons.css',
    '~/assets/css/main.css',
  ],

  imports: {
    dirs: [
      'stores',
      'composables',
      'types',
    ],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  devtools: {
    enabled: true,
  },

  quasar: {
    plugins: [
      'Dialog',
      'Loading',
      'Notify',
    ],
    config: {
      ripple: false,
      brand: {
        primary: '#2563eb',
        secondary: '#0f766e',
        accent: '#64748b',
        dark: '#0f172a',
        positive: '#16a34a',
        negative: '#dc2626',
        info: '#0284c7',
        warning: '#d97706',
      },
    },
  },

  feathers: {
    auth: {
      authStrategies: ['local', 'jwt'],
      local: {
        usernameField: 'userId',
        passwordField: 'password',
        entityUsernameField: 'userId',
        entityPasswordField: 'password',
      },
    },
    servicesDirs: ['services'],
    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      },
    },
    database: {
      mongo: {
        url: process.env.MONGODB_URL || 'mongodb://root:changeMe@127.0.0.1:27037/nfz_starter?authSource=admin',
        management: {
          enabled: true,
          basePath: '/mongo-admin',
          auth: {
            enabled: true,
            authenticate: true,
            adminRoleNames: ['admin'],
            rolesField: 'roles',
          },
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeCollectionCrud: false,
          showSystemDatabases: false,
        },
      },
    },
    server: {
      moduleDirs: [],
      modules: [
        {
          src: 'server/feathers/modules/seed-users.ts',
          phase: 'post',
        },
      ],
      secureDefaults: true,
      secure: {
        cors: true,
        compression: true,
        helmet: false,
        bodyParser: {
          json: true,
          urlencoded: true,
        },
      },
    },
    client: {
      mode: 'embedded',
      pinia: {
        idField: 'id',
      },
    },
  },

  runtimeConfig: {
    demo: {
      user: process.env.NFZ_DEMO_USER || 'admin',
      password: process.env.NFZ_DEMO_PASSWORD || 'admin123',
      roles: process.env.NFZ_DEMO_ROLES || 'admin,user',
    },
    public: {
      appName: 'NFZ Starter',
      appSubtitle: 'Nuxt 4 + Quasar 2 + UnoCSS + Pinia + NFZ',
    },
  },
})
