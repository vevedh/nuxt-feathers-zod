import type { Application as FeathersKoaApplication } from '@feathersjs/koa'
import { serveStatic } from '@feathersjs/koa'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  (app as any as FeathersKoaApplication).use(serveStatic('./public'))
})
