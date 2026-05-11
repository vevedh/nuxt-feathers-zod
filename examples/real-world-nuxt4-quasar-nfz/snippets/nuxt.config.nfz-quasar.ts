export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-quasar-ui',
    '@unocss/nuxt',
    'nuxt-feathers-zod'
  ],

  quasar: {
    lang: 'fr',
    iconSet: 'material-icons',
    plugins: ['Dialog', 'Loading', 'Notify', 'AppFullscreen'],
    extras: {
      fontIcons: ['material-icons']
    },
    components: {
      autoImport: true
    }
  },

  feathers: {
    client: {
      mode: 'embedded'
    },
    transports: {
      rest: true,
      websocket: false
    },
    server: {
      enabled: true
    },
    auth: {
      enabled: true,
      service: 'users',
      entity: 'user',
      entityId: 'id',
      entityClass: 'User',
      authStrategies: ['jwt', 'local'],
      local: {
        usernameField: 'email',
        passwordField: 'password',
        entityUsernameField: 'email',
        entityPasswordField: 'password'
      }
    },
    database: {
      mongo: {
        url: process.env.MONGO_URL
      }
    }
  }
})
