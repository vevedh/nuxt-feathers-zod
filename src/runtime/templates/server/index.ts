import type { ResolvedOptions } from '../../../runtime/options'
import type { Templates } from '../types'
import { getServerAuthContents } from './authentication.ts'
import { getServerAppContents } from './app.ts'
import { getServerKeycloakContents } from './keycloak.ts'
import { getServerMongodbContents } from './mongodb.ts'
import { getServerPluginContents } from './plugin.ts'
import { getSecureDefaultsModuleContents } from './secure-defaults.ts'
import { getServerRuntimeContents } from './server-runtime.ts'
import { getServerTypesContents } from './server-types.ts'

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
