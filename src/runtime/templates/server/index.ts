import type { ResolvedOptions } from '../../../runtime/options'
import type { Templates } from '../types'
import { getServerAuthContents } from './authentication'
import { getServerAuthTypesContents } from './authentication-types'
import { getServerAppContents } from './app'
import { getServerKeycloakContents, getServerKeycloakTypesContents } from './keycloak'
import { getServerMongodbContents, getServerMongodbTypesContents } from './mongodb'
import { getServerPluginContents } from './plugin'
import { getServerRestBridgeContents } from './rest-bridge'
import { getSecureDefaultsModuleContents } from './secure-defaults'
import { getServerContents, getServerTypesContents } from './server'
import { getServerValidatorContents, getServerValidatorTypesContents } from './validators'

export function getServerTemplates(options: ResolvedOptions): Templates {
  const serverTemplates: Templates = [
    {
      filename: 'feathers/server/server.ts',
      getContents: getServerContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/server.d.ts',
      getContents: getServerTypesContents(options),
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
    {
      filename: 'feathers/server/rest-bridge.ts',
      getContents: getServerRestBridgeContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/validators.ts',
      getContents: getServerValidatorContents(options),
      write: true,
    },
    {
      filename: 'feathers/server/validators.d.ts',
      getContents: getServerValidatorTypesContents(options),
      write: true,
    },
  ]

  if (options.database.mongo) {
    serverTemplates.push({
      filename: 'feathers/server/mongodb.ts',
      getContents: getServerMongodbContents(options),
      write: true,
    })
    serverTemplates.push({
      filename: 'feathers/server/mongodb.d.ts',
      getContents: getServerMongodbTypesContents(options),
      write: true,
    })
  }

  if (options.auth) {
    serverTemplates.push({
      filename: 'feathers/server/authentication.ts',
      getContents: getServerAuthContents(options),
      write: true,
    })
    serverTemplates.push({
      filename: 'feathers/server/authentication.d.ts',
      getContents: getServerAuthTypesContents(options),
      write: true,
    })
  }

  if (options.keycloak) {
    serverTemplates.push({
      filename: 'feathers/server/keycloak.ts',
      getContents: getServerKeycloakContents(options),
      write: true,
    })
    serverTemplates.push({
      filename: 'feathers/server/keycloak.d.ts',
      getContents: getServerKeycloakTypesContents(options),
      write: true,
    })
  }

  return serverTemplates
}
