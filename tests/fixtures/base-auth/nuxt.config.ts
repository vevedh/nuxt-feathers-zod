export default defineNuxtConfig({
  modules: [
    '../../../src/module',
  ],

  feathers: {
    server: {
      plugins: [
        '../../plugins/dummy-users.ts',
      ],
    },
    servicesDirs: [
      '../../../services/users',
    ],
  },
})
