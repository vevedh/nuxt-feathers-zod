export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',

  // Version SSR : le rendu serveur reste actif, mais Keycloak demeure strictement client-only.
  // Les zones dépendantes de la session SSO/LDAP sont rendues via <ClientOnly> pour éviter
  // les mismatches d'hydratation.
  ssr: true,

  devtools: {
    enabled: true,
  },

  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    'nuxt-quasar-ui',
    'nuxt-feathers-zod',
  ],

  css: [
    '@quasar/extras/material-icons/material-icons.css',
    'quasar/dist/quasar.css',
  ],

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'js-sha256',
        'keycloak-js',
        'socket.io-client',
      ],
    },
  },

  quasar: {
    lang: 'fr',
    iconSet: 'material-icons',
    plugins: [
      'Dialog',
      'Loading',
      'Notify',
    ],
    extras: {
      fontIcons: [
        'material-icons',
      ],
    },
    components: {
      autoImport: true,
    },
  },

  runtimeConfig: {
    public: {
      authDebug: process.env.NUXT_PUBLIC_AUTH_DEBUG === 'true',

      keycloak: {
        serverUrl: process.env.KEYCLOAK_SERVER_URL || 'https://keycloak.example.local',
        realm: process.env.KEYCLOAK_REALM || 'EXAMPLE',
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'nuxt4app',
        onLoad: process.env.KEYCLOAK_ON_LOAD || 'check-sso',
      },

      ldapBridge: {
        autoSync: process.env.NUXT_PUBLIC_LDAP_AUTO_SYNC !== 'false',
      },
    },
  },

  feathers: {
    client: {
      mode: 'remote',

      remote: {
        url: process.env.NFZ_REMOTE_URL || 'https://api.example.local',
        transport: 'rest',

        // Le serveur expose /authentication à la racine.
        restPath: process.env.NFZ_REMOTE_REST_PATH ?? '',
        websocketPath: process.env.NFZ_REMOTE_SOCKET_PATH || '/socket.io',

        services: [
          {
            path: 'authentication',
            methods: ['create', 'remove'],
          },
          {
            path: 'users',
            methods: ['find', 'get'],
          },
          {
            path: 'ldap-users',
            methods: ['find', 'get'],
          },
        ],
      },

      pinia: true,
    },

    // Keycloak n'est pas configuré dans NFZ.
    // NFZ reste uniquement le client Feathers remote/direct.
    keycloak: false,
    auth: false,
    server: {
      enabled: false,
    },
  },
})
