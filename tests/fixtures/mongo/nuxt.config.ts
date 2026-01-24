export default defineNuxtConfig({
  modules: [
    '../../../src/module',
  ],

  feathers: {
    server: {
      plugins: [
        '../../plugins/dummy-mongos.ts',
      ],
    },
    client: false,
    auth: false,
    servicesDirs: [
      '../../../services/mongos',
    ],
  },
})
