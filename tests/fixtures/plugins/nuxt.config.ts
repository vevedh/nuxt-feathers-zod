export default defineNuxtConfig({
  modules: [
    '../../../src/module',
  ],

  feathers: {
    auth: false,
    client: {
      pinia: false,
      plugins: './client2.ts',
    },
  },
})
