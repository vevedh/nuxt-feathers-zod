import type { Application as FeathersExpressApplication } from '@feathersjs/express'
import type { Application as FeathersKoaApplication } from '@feathersjs/koa'
import { serveStatic as expressServeStatic } from '@feathersjs/express'
import { serveStatic as koaServeStatic } from '@feathersjs/koa'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  console.log('Load static plugin')
  const framework = app.get('framework')
  if (framework === 'koa')
    (app as unknown as FeathersKoaApplication).use(koaServeStatic('./public'))
  if (framework === 'express')
    (app as unknown as FeathersExpressApplication).use(expressServeStatic('./public'))
})
