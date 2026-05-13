export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-quasar-ui',
    '@unocss/nuxt',
<<<<<<< HEAD
    'nuxt-feathers-zod',
=======
    'nuxt-feathers-zod'
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
  ],

  quasar: {
    lang: 'fr',
    iconSet: 'material-icons',
    plugins: ['Dialog', 'Loading', 'Notify', 'AppFullscreen'],
    extras: {
<<<<<<< HEAD
      fontIcons: ['material-icons'],
    },
    components: {
      autoImport: true,
    },
=======
      fontIcons: ['material-icons']
    },
    components: {
      autoImport: true
    }
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
  },

  feathers: {
    client: {
<<<<<<< HEAD
      mode: 'embedded',
    },
    transports: {
      rest: true,
      websocket: false,
    },
    server: {
      enabled: true,
=======
      mode: 'embedded'
    },
    transports: {
      rest: true,
      websocket: false
    },
    server: {
      enabled: true
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
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
<<<<<<< HEAD
        entityPasswordField: 'password',
      },
    },
    database: {
      mongo: {
        url: process.env.MONGO_URL,
      },
    },
  },
=======
        entityPasswordField: 'password'
      }
    },
    database: {
      mongo: {
        url: process.env.MONGO_URL
      }
    }
  }
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
})
