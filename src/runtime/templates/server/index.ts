import type { ResolvedOptions } from '../../../runtime/options'
import type { Templates } from '../types'
import { getServerAuthContents } from './authentication'
import { getServerAppContents } from './app'
import { getServerKeycloakContents } from './keycloak'
import { getServerMongodbContents } from './mongodb'
import { getServerPluginContents } from './plugin'
import { getSecureDefaultsModuleContents } from './secure-defaults'
import { getServerContents } from './server'

export function getServerTemplates(options: ResolvedOptions): Templates {
  const serverTemplates: Templates = [
    {
      filename: 'feathers/server/server.ts',
      getContents: getServerContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/app.ts',
      getContents: getServerAppContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/modules/secure-defaults.ts',
      getContents: getSecureDefaultsModuleContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/plugin.ts',
      getContents: getServerPluginContents(options),
      write: true,
    },
  ]

  if (options.database.mongo) {
    serverTemplates.push({
      filename: 'feathers/server/mongodb.ts',
      getContents: getServerMongodbContents(options),
      write: true,
    })
  }

  if (options.auth) {
    serverTemplates.push({
      filename: 'feathers/server/authentication.ts',
      getContents: getServerAuthContents(options),
      write: true,
    })
  }

  if (options.keycloak) {
    serverTemplates.push({
      filename: 'feathers/server/keycloak.ts',
      getContents: getServerKeycloakContents(options),
      write: true,
    })
  }

  return serverTemplates
}
