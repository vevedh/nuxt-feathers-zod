import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export const dummyServerPlugin = defineFeathersServerPlugin(() => {
  console.log('Dummy feathers plugin for test')
})
