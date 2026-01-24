export default defineNuxtConfig({
  modules: [
    '../../../src/module',
  ],

  feathers: {
    server: {
      plugins: [
        '../../plugins/dummy-messages.ts',
      ],
    },
    servicesDirs: [
      '../../../services/messages',
    ],
  },
})
