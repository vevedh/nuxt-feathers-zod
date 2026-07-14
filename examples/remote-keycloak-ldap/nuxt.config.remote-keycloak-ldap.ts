export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '',
        services: [
          { path: 'authentication', methods: ['create', 'remove'] },
          { path: 'users', methods: ['find', 'get'] },
          { path: 'news', methods: ['find', 'get', 'create', 'patch', 'remove'] },
        ],
      },
      pinia: true,
    },

    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'COSCA',
      clientId: 'portail-comite',
      onLoad: 'check-sso',
      mode: 'client-only',
    },

    auth: false,
    server: { enabled: false },
  },
})
