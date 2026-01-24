// For more information about this file see https://dove.feathersjs.com/guides/cli/channels.html
import type { RealTimeConnection } from '@feathersjs/feathers'
import type { HookContext } from 'nuxt-feathers-zod/server'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'
import '@feathersjs/transport-commons'

export default defineFeathersServerPlugin((app) => {
  if (app.get('websocket')) { // ! Only add real-time events if the websocket transport is enabled
    app.on('connection', (connection: RealTimeConnection) => {
    // On a new real-time connection, add it to the anonymous channel
      app.channel('anonymous').join(connection)
      console.log('New client connected')
    })

    app.publish((data: any, context: HookContext) => {
      // Here you can add event publishers to channels set up in `channels.js`
      // To publish only for a specific event use `app.publish(eventname, () => {})`

      // e.g. to publish all service events to all anonymous users use
      return app.channel('anonymous')
    })
  }
})
