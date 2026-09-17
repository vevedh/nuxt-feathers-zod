import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    database: {
      default: 'postgresql',
      connections: {
        postgresql: {
          type: 'postgresql',
          connection: process.env.POSTGRESQL_URL!,
        },
        mysql: {
          type: 'mysql',
          connection: process.env.MYSQL_URL!,
        },
        mariadb: {
          type: 'mariadb',
          connection: process.env.MARIADB_URL!,
        },
      },
    },
  },
})
