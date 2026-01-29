import type { HookContext, NextFunction } from 'nuxt-feathers-zod/server'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  app.hooks({
    setup: [
      async (context: HookContext, next: NextFunction) => {
        console.log('Running dummy setup hook')

        await context.app.service('messages').create([
          { text: 'Hello from the dummy setup hook!' },
          { text: 'Second hello from the dummy setup hook!' },
        ])

        // Keycloak-only: do not seed local users during setup
        // (users schema/resolvers may be different and will throw)
        const provider
          = process.env.NUXT_PUBLIC_FEATHERS_AUTH_PROVIDER
            || process.env.FEATHERS_AUTH_PROVIDER
            || ''

        if (provider !== 'keycloak') {
          await context.app.service('users').create([
            { userId: 'test', password: '12345' },
          ])
        }
        else {
          console.log('[dummy] users seed skipped (keycloak-only)')
        }

        await context.app.service('mongos').create([
          { text: 'mongo' },
        ])

        await next()
      },
    ],
  })
})
