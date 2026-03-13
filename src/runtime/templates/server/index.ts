import type { ResolvedOptions } from '../../../runtime/options'
import type { Templates } from '../types'
import { getServerAuthContents } from './authentication.js'
import { getServerAppContents } from './app.js'
import { getServerKeycloakContents } from './keycloak.js'
import { getServerMongodbContents } from './mongodb.js'
import { getServerPluginContents } from './plugin.js'
import { getSecureDefaultsModuleContents } from './secure-defaults.js'
import { getServerRuntimeContents } from './server-runtime.js'
import { getServerTypesContents } from './server-types.js'

export function getServerTemplates(options: ResolvedOptions): Templates {
  const serverTemplates: Templates = [
    {
      filename: 'feathers/server/server.js',
      getContents: getServerRuntimeContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/server.d.ts',
      getContents: getServerTypesContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/app.js',
      getContents: getServerAppContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/modules/secure-defaults.js',
      getContents: getSecureDefaultsModuleContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/plugin.js',
      getContents: getServerPluginContents(options),
      write: true,
    },
  ]

  if (options.database.mongo) {
    serverTemplates.push({
      filename: 'feathers/server/mongodb.js',
      getContents: getServerMongodbContents(options),
      write: true,
    })
  }

  if (options.auth) {
    serverTemplates.push({
      filename: 'feathers/server/authentication.js',
      getContents: getServerAuthContents(options),
      write: true,
    })
  }

  if (options.keycloak) {
    serverTemplates.push({
      filename: 'feathers/server/keycloak.js',
      getContents: getServerKeycloakContents(options),
      write: true,
    })
  }

  return serverTemplates
}
