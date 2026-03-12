import type { HookContext, NextFunction } from 'nuxt-feathers-zod/server'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  app.hooks({
    setup: [
      async (context: HookContext, next: NextFunction) => {
        console.log('Running dummy setup hook')

        // NOTE: keep setup hook robust across adapters/schema hooks.
        // Some schema resolvers (e.g. passwordHash) and zod validators are not multi-create aware.
        // Avoid passing arrays to .create() in setup hooks.
        try {
          await context.app.service('messages').create({ text: 'Hello from the dummy setup hook!' })
          await context.app.service('messages').create({ text: 'Second hello from the dummy setup hook!' })
        }
        catch (err) {
          console.warn('[dummy] messages seed failed (ignored):', err)
        }

        // Keycloak-enabled scenarios: do not seed local users during setup.
        // In embedded+auth+keycloak, provider may still not be reported as 'keycloak'
        // during boot, so rely on the explicit playground toggle first.
        const provider
          = process.env.NUXT_PUBLIC_FEATHERS_AUTH_PROVIDER
            || process.env.FEATHERS_AUTH_PROVIDER
            || ''
        const keycloakEnabled
          = process.env.NFZ_KEYCLOAK_ENABLED === 'true'
            || process.env.NFZ_KEYCLOAK_ENABLED === '1'
            || provider === 'keycloak'

        if (!keycloakEnabled) {
          try {
            const users = context.app.service('users')
            let exists = false

            try {
              const found = await users.find({ query: { userId: 'test', $limit: 1 } as any }) as any
              const items = Array.isArray(found) ? found : (Array.isArray(found?.data) ? found.data : [])
              exists = items.some((item: any) => item?.userId === 'test')
            }
            catch {
              // ignore lookup failure and try create
            }

            if (!exists)
              await users.create({ userId: 'test', password: '12345' })

            try {
              const found = await users.find({ query: { userId: 'test', $limit: 1 } as any }) as any
              const items = Array.isArray(found) ? found : (Array.isArray(found?.data) ? found.data : [])
              exists = items.some((item: any) => item?.userId === 'test')
            }
            catch {
              // ignore recheck failure
            }

            if (exists)
              console.log('[dummy] local auth seed ready: test / 12345')
            else
              console.warn('[dummy] local auth seed could not be verified for userId=test')
          }
          catch (err) {
            console.warn('[dummy] users seed failed (ignored):', err)
          }
        }
        else {
          console.log('[dummy] users seed skipped (keycloak enabled)')
        }

        const embeddedMongoEnabled
          = process.env.NFZ_PLAYGROUND_EMBEDDED_MONGODB !== 'false'
            && process.env.NFZ_PLAYGROUND_EMBEDDED_MONGODB !== '0'

        if (embeddedMongoEnabled) {
          try {
            await context.app.service('mongos').create({ text: 'mongo' })
          }
          catch (err) {
            console.warn('[dummy] mongos seed failed (ignored):', err)
          }
        }
        else {
          console.log('[dummy] mongos seed skipped (embedded mongo disabled)')
        }

        await next()
      },
    ],
  })
})
