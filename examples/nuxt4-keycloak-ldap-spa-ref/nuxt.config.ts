export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',

  // Keycloak est un flux navigateur : l'exemple reste volontairement SPA.
  ssr: false,

  devtools: {
    enabled: true,
  },

  modules: [
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
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

        // Ton serveur expose /authentication à la racine.
        // Ne pas utiliser '/feathers' si le backend n'est pas monté sous ce préfixe.
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

    // Important : Keycloak n'est PAS configuré dans NFZ ici.
    // NFZ reste le client Feathers remote. Keycloak est initialisé par app/plugins/keycloak.client.ts.
    // Cela supprime les appels legacy vers /_keycloak.
    keycloak: false,
    auth: false,
    server: {
      enabled: false,
    },
  },
})
