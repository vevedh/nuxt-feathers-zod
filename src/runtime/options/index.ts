import type { Nuxt } from '@nuxt/schema'
import type { AuthOptions, PublicAuthOptions, ResolvedAuthOptions, ResolvedAuthOptionsOrDisabled } from './authentication'
import type { ClientOptions, ResolvedClientOptions, ResolvedClientOptionsOrDisabled } from './client'
import type { PiniaOptions } from './client/pinia'
import type { DataBaseOptions, ResolvedDataBaseOptions } from './database'
import type { MongoManagementRouteSpec } from './database/mongodb'
import type { KeycloakOptions, ResolvedKeycloakOptions, ResolvedKeycloakOptionsOrDisabled } from './keycloak'
import type { ResolvedServerOptions, ServerOptions } from './server'
import type { ServicesDir, ServicesDirs } from './services'
import type { ResolvedSwaggerOptionsOrDisabled, SwaggerOptions, SwaggerOptionsOrDisabled } from './swagger'
import type { ResolvedTemplatesOptions, TemplatesOptions } from './templates'
import type { ResolvedTransportsOptions, TransportsOptions } from './transports'
import type { ResolvedValidatorOptions, ValidatorOptions } from './validator'

import { createResolver } from '@nuxt/kit'

import { getServicesImports } from '../services'
import { resolveAuthOptions } from './authentication'
import { resolveClientOptions } from './client'
import { resolveDataBaseOptions } from './database'
import { getMongoManagementRoutes } from './database/mongodb'
import { resolveKeycloakOptions } from './keycloak'
import { getResolvedClientMode, isRemoteClientMode } from './mode'
import { resolveServerOptions } from './server'
import { resolveServicesDirs } from './services'
import { resolveSwaggerOptions } from './swagger'
import { resolveTemplatesOptions } from './templates'
import { resolveTransportsOptions } from './transports'
import { resolveValidatorOptions } from './validator'

export interface ModuleOptions {
  transports: TransportsOptions
  database: DataBaseOptions
  servicesDirs: ServicesDir | ServicesDirs
  server: ServerOptions
  auth: AuthOptions | boolean
  keycloak?: KeycloakOptions | boolean
  client: ClientOptions | boolean
  validator: ValidatorOptions
  loadFeathersConfig: boolean
  swagger?: SwaggerOptionsOrDisabled
  templates?: TemplatesOptions
  devtools?: boolean
}

export interface ResolvedOptions {
  templateDir: string
  transports: ResolvedTransportsOptions
  database: ResolvedDataBaseOptions
  servicesDirs: ServicesDirs
  server: ResolvedServerOptions
  auth: ResolvedAuthOptionsOrDisabled
  keycloak: ResolvedKeycloakOptionsOrDisabled
  client: ResolvedClientOptionsOrDisabled
  validator: ResolvedValidatorOptions
  loadFeathersConfig: boolean
  swagger?: ResolvedSwaggerOptionsOrDisabled
  templates: ResolvedTemplatesOptions
  devtools: boolean
}

export interface FeathersRuntimeConfig {
  auth?: ResolvedAuthOptions
  keycloak?: Partial<ResolvedKeycloakOptions>
}

export interface FeathersPublicRuntimeConfig {
  transports?: ResolvedTransportsOptions
  client?: {
    mode: 'embedded' | 'remote'
    remote?: {
      url: string
      transport?: 'auto' | 'rest' | 'socketio'
      restPath?: string
      websocketPath?: string
      auth?: {
        enabled?: boolean
        servicePath?: string
        payloadMode?: 'jwt' | 'keycloak'
        strategy?: string
        tokenField?: string
        reauth?: boolean
        storageKey?: string
      }
      services?: Array<{
        path: string
        methods?: string[]
      }>
    }
  }
  auth?: PublicAuthOptions
  pinia?: PiniaOptions
  keycloak?: {
    serverUrl: string
    realm: string
    clientId: string
    authServicePath: string
    onLoad: 'check-sso' | 'login-required'
  }
  database?: {
    mongo?: {
      enabled?: boolean
      management?: {
        enabled?: boolean
        basePath?: string
        auth?: {
          enabled?: boolean
          authenticate?: boolean
        }
        routes?: MongoManagementRouteSpec[]
      }
    }
  }
  builder?: {
    enabled?: boolean
    basePath?: string
    auth?: {
      enabled?: boolean
      authenticate?: boolean
    }
    routes?: Array<{
      key: string
      path: string
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    }>
  }
  admin?: {
    diagnostics?: {
      enabled?: boolean
      path?: string
      jsonPath?: string
      format?: 'nfz-devtools-payload'
    }
    devtools?: {
      enabled?: boolean
      path?: string
      jsonPath?: string
      cssPath?: string
      iconPath?: string
    }
  }
  authProvider?: string
}

export interface ModuleConfig extends Partial<ModuleOptions> {}

export async function resolveOptions(options: ModuleOptions, nuxt: Nuxt): Promise<ResolvedOptions> {
  const rootDir = nuxt.options.rootDir
  const srcDir = nuxt.options.srcDir
  const servicesDirs = resolveServicesDirs(options.servicesDirs, rootDir)
  const templateDir = createResolver(nuxt.options.buildDir).resolve('feathers')
  const transports = resolveTransportsOptions(options.transports, nuxt.options.ssr !== false)
  const database = resolveDataBaseOptions(options.database)
  const client = await resolveClientOptions(options.client, Boolean(database.mongo), rootDir, srcDir)
  const serverFramework = transports.rest && typeof transports.rest === 'object' ? transports.rest.framework : 'express'
  const explicitServer = typeof options.server === 'object' && options.server !== null ? options.server : undefined
  const serverInput = getResolvedClientMode(client) === 'remote' && explicitServer?.enabled === undefined
    ? { ...explicitServer, enabled: false }
    : options.server
  const server = await resolveServerOptions(serverInput, rootDir, srcDir, serverFramework)
  const validator = resolveValidatorOptions(options.validator)
  const swagger = resolveSwaggerOptions(options.swagger, transports)
  const templates = resolveTemplatesOptions(options.templates, rootDir)

  const servicesImports = getResolvedClientMode(client) === 'embedded'
    ? await getServicesImports(servicesDirs)
    : []

  const auth = resolveAuthOptions(
    options.auth,
    {
      client: Boolean(client),
      mode: client && isRemoteClientMode(client) ? 'remote' : 'embedded',
    },
    servicesImports,
    rootDir,
  )

  const keycloak = resolveKeycloakOptions(options.keycloak)

  return {
    templateDir,
    transports,
    database,
    servicesDirs,
    server,
    auth,
    keycloak,
    client,
    validator,
    loadFeathersConfig: options.loadFeathersConfig,
    swagger,
    templates,
    devtools: options.devtools !== false,
  }
}

function toPublicRemoteClientConfig(client: ResolvedClientOptions['remote']) {
  if (!client) {
    return undefined
  }

  return {
    url: client.url,
    transport: client.transport,
    restPath: client.restPath,
    websocketPath: client.websocketPath,
    auth: client.auth
      ? {
          enabled: client.auth.enabled,
          servicePath: client.auth.servicePath,
          payloadMode: client.auth.payloadMode,
          strategy: client.auth.strategy,
          tokenField: client.auth.tokenField,
          reauth: client.auth.reauth,
          storageKey: client.auth.storageKey,
        }
      : undefined,
    services: client.services?.map((service) => {
      const methods = Array.isArray(service.methods) && service.methods.length ? service.methods : undefined
      return methods ? { path: service.path, methods } : { path: service.path }
    }) ?? [],
  }
}

export function resolveRuntimeConfig(options: ResolvedOptions): FeathersRuntimeConfig {
  return {
    auth: options.auth || undefined,
    keycloak: options.keycloak || undefined,
  }
}

export function resolvePublicRuntimeConfig(options: ResolvedOptions): FeathersPublicRuntimeConfig {
  const mongoManagement = options.database?.mongo?.management
  const mongoManagementPublic = mongoManagement
    ? {
        enabled: mongoManagement.enabled,
        basePath: mongoManagement.basePath,
        auth: {
          enabled: mongoManagement.auth?.enabled,
          authenticate: mongoManagement.auth?.authenticate,
        },
        routes: getMongoManagementRoutes(mongoManagement),
      }
    : undefined

  return {
    transports: getResolvedClientMode(options.client) === 'embedded' ? options.transports : undefined,
    client: options.client
      ? {
          mode: options.client.mode,
          remote: toPublicRemoteClientConfig(options.client.remote),
        }
      : undefined,
    auth: options.auth
      ? {
          authStrategies: options.auth.authStrategies,
          servicePath: options.auth.service,
          entityKey: options.auth.entity,
          entityClass: options.auth.entityClass,
          client: options.auth.client || {},
        }
      : undefined,
    pinia: options.client && options.client.pinia !== false ? options.client.pinia : undefined,
    keycloak: options.keycloak
      ? {
          serverUrl: options.keycloak.serverUrl,
          realm: options.keycloak.realm,
          clientId: options.keycloak.clientId,
          authServicePath: options.keycloak.authServicePath,
          onLoad: options.keycloak.onLoad,
        }
      : undefined,
    database: options.database?.mongo
      ? {
          mongo: {
            enabled: true,
            management: mongoManagementPublic,
          },
        }
      : undefined,
    builder: {
      enabled: true,
      basePath: '/api/nfz',
      auth: {
        enabled: true,
        authenticate: true,
      },
      routes: [
        { key: 'services', path: '/api/nfz/services', method: 'GET' },
        { key: 'manifest', path: '/api/nfz/manifest', method: 'GET' },
        { key: 'manifestSave', path: '/api/nfz/manifest', method: 'POST' },
        { key: 'schemaGet', path: '/api/nfz/schema', method: 'GET' },
        { key: 'schemaSave', path: '/api/nfz/schema', method: 'POST' },
        { key: 'preview', path: '/api/nfz/preview', method: 'POST' },
        { key: 'apply', path: '/api/nfz/apply', method: 'POST' },
      ],
    },
    admin: options.devtools !== false
      ? {
          diagnostics: {
            enabled: true,
            path: '/__nfz-devtools',
            jsonPath: '/__nfz-devtools.json',
            format: 'nfz-devtools-payload',
          },
          devtools: {
            enabled: true,
            path: '/__nfz-devtools',
            jsonPath: '/__nfz-devtools.json',
            cssPath: '/__nfz-devtools.css',
            iconPath: '/__nfz-devtools-icon.png',
          },
        }
      : undefined,
    authProvider: options.keycloak ? 'keycloak' : undefined,
  }
}
