import type { Nuxt } from '@nuxt/schema'
import type { AuthOptions, PublicAuthOptions, ResolvedAuthOptions, ResolvedAuthOptionsOrDisabled } from './authentication'
import type { ClientOptions, ResolvedClientOptions, ResolvedClientOptionsOrDisabled } from './client'
import type { PiniaOptions } from './client/pinia'
import type { DataBaseOptions, ResolvedDataBaseOptions } from './database'
import type { KeycloakOptions, ResolvedKeycloakOptions, ResolvedKeycloakOptionsOrDisabled } from './keycloak'
import type { ResolvedServerOptions, ServerOptions } from './server'
import type { ServicesDir, ServicesDirs } from './services'
import type { ResolvedSwaggerOptionsOrDisabled, SwaggerOptions, SwaggerOptionsOrDisabled } from './swagger'
import type { ResolvedTransportsOptions, TransportsOptions } from './transports'
import type { ResolvedValidatorOptions, ValidatorOptions } from './validator'
import type { ResolvedTemplatesOptions, TemplatesOptions } from './templates'
import { createResolver } from '@nuxt/kit'
import { getServicesImports } from '../services'
import { resolveAuthOptions } from './authentication'
import { resolveClientOptions } from './client'
import { resolveDataBaseOptions } from './database'
import { resolveKeycloakOptions } from './keycloak'
import { getResolvedClientMode, isRemoteClientMode } from './mode'
import { resolveServerOptions } from './server'
import { resolveServicesDirs } from './services'
import { resolveSwaggerOptions } from './swagger'
import { resolveTransportsOptions } from './transports'
import { resolveValidatorOptions } from './validator'
import { resolveTemplatesOptions } from './templates'

// Module options TypeScript interface definition
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
}

export interface FeathersRuntimeConfig {
  auth?: ResolvedAuthOptions
  // Runtime config only needs a subset on the server.
  // Keep it loose to avoid forcing full Keycloak options here.
  keycloak?: Partial<ResolvedKeycloakOptions>
}

export interface FeathersPublicRuntimeConfig {
  transports: ResolvedTransportsOptions
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
}

export type ModuleConfig = Partial<Omit<ModuleOptions, 'auth'> & {
  auth: Omit<AuthOptions, 'entityImport'> | boolean
}>


function toPublicRemoteClientConfig(client: ResolvedClientOptions | false | undefined): FeathersPublicRuntimeConfig['client'] {
  if (!client)
    return undefined

  const remote = client.remote
    ? {
        url: client.remote.url,
        transport: client.remote.transport,
        restPath: client.remote.restPath,
        websocketPath: client.remote.websocketPath,
        auth: client.remote.auth
          ? {
              enabled: client.remote.auth.enabled,
              servicePath: client.remote.auth.servicePath,
              payloadMode: client.remote.auth.payloadMode,
              strategy: client.remote.auth.strategy,
              tokenField: client.remote.auth.tokenField,
              reauth: client.remote.auth.reauth,
              storageKey: client.remote.auth.storageKey,
            }
          : undefined,
        services: Array.isArray(client.remote.services)
          ? client.remote.services.map(service => ({
              path: service.path,
              methods: Array.isArray(service.methods) ? [...service.methods] : undefined,
            }))
          : undefined,
      }
    : undefined

  return {
    mode: client.mode,
    remote,
  }
}

export async function resolveOptions(options: ModuleOptions, nuxt: Nuxt): Promise<ResolvedOptions> {
  const { rootDir, srcDir, serverDir, appDir, buildDir, ssr } = nuxt.options

  /**
   * nuxt issue: https://github.com/nuxt/nuxt/issues/28995#issuecomment-2843183972
   *
   * WORKAROUND:
   * Ha a compatibilityVersion: 4, akkor a buildDir a node_modules/.cache/nuxt/.nuxt könyvtárba kerül, ahonnan nem tudja betölteni a ts fájlokat.
   * Ezért itt manuálisan felülirom a régi (.nuxt) könyvtárra.   *
   */
  const resolver = createResolver(import.meta.url)
  // if (nuxt.options.test || nuxt.options.dev) {

  const templateDir = /node_modules/.test(buildDir) ? resolver.resolve(rootDir, '.nuxt/feathers') : resolver.resolve(buildDir, 'feathers')

  const templates = resolveTemplatesOptions(options.templates, rootDir)

  const transports = resolveTransportsOptions(options.transports, ssr)
  const database = resolveDataBaseOptions(options.database)
  const servicesDirs = resolveServicesDirs(options.servicesDirs, rootDir)
  const server = await resolveServerOptions(options.server, rootDir, serverDir, (transports.rest as any)?.framework ?? 'express')
  const client = await resolveClientOptions(options.client, !!database.mongo, rootDir, srcDir)
  const validator = resolveValidatorOptions(options.validator)
  const swagger = resolveSwaggerOptions(options.swagger, transports)
  const isRemote = isRemoteClientMode(client)
  const servicesImports = isRemote ? [] : await getServicesImports(servicesDirs) // TODO move
  const keycloak = resolveKeycloakOptions(options.keycloak)

  // Keycloak SSO can run in two ways:
  // - historical: SSO-only bridge service (/_keycloak)
  // - unified: always materialize a Feathers auth session via `authentication.create({ strategy, ...token })`
  //
  // To support the unified flow in **embedded** mode, keep the authentication service enabled by default
  // when Keycloak is configured (JWT strategy only unless the user explicitly overrides authStrategies).
  let auth: any
  // Authentication resolution:
  // - embedded: requires local service schema imports (entityImport) to type the auth entity
  // - remote: does NOT require local schema imports (entityImport optional)
  if (options.auth === false) {
    auth = false
  }
  else if (!isRemote && keycloak) {
    const base: any = (options.auth === true || options.auth == null)
      ? { authStrategies: ['jwt'] as const }
      : options.auth
    const withJwtDefault = (base && typeof base === 'object' && !base.authStrategies)
      ? { ...base, authStrategies: ['jwt'] as const }
      : base

    auth = resolveAuthOptions(withJwtDefault, { client: !!client, mode: 'embedded' }, servicesImports, appDir)
  }
  else {
    auth = resolveAuthOptions(options.auth, { client: !!client, mode: getResolvedClientMode(client) }, servicesImports, appDir)
  }
  const loadFeathersConfig = options.loadFeathersConfig

  const resolvedOptions = {
    templateDir,
    templates,
    transports,
    database,
    servicesDirs,
    server,
    client,
    validator,
    auth,
    keycloak,
    loadFeathersConfig,
    swagger,
  }
  return resolvedOptions
}

export function resolveRuntimeConfig(options: ResolvedOptions): FeathersRuntimeConfig {
  const runtimeConfig: FeathersRuntimeConfig = { }

  if (options.auth) {
    runtimeConfig.auth = options.auth
  }

  if (options.keycloak) {
    runtimeConfig.keycloak = {
      authServicePath: options.keycloak.authServicePath,
    }
  }

  return runtimeConfig
}

export function resolvePublicRuntimeConfig(options: ResolvedOptions): FeathersPublicRuntimeConfig {
  const publicRuntimeConfig: FeathersPublicRuntimeConfig = {
    transports: options.transports,
  }

  const client = options.client as ResolvedClientOptions
  const publicClient = toPublicRemoteClientConfig(client)
  if (publicClient)
    publicRuntimeConfig.client = publicClient
  const auth = options.auth as ResolvedAuthOptions
  if (auth?.client) {
    publicRuntimeConfig.auth = {
      authStrategies: auth.authStrategies,
      servicePath: auth.service,
      entityKey: auth.entity,
      entityClass: auth.entityClass,
      client: auth.client,
    }
  }
  if (client?.pinia) {
    publicRuntimeConfig.pinia = client.pinia
  }

  if (options.keycloak) {
    publicRuntimeConfig.keycloak = {
      serverUrl: options.keycloak.serverUrl,
      realm: options.keycloak.realm,
      clientId: options.keycloak.clientId,
      authServicePath: options.keycloak.authServicePath,
      onLoad: options.keycloak.onLoad,
    } as any
  }

  return publicRuntimeConfig
}

/*
    await setServerDefaults(options.server, nuxt)
    await setClientDefaults(options, nuxt)
    setTransportsDefaults(options.transports, nuxt)
    setValidatorFormatsDefaults(options.validator, nuxt)

    const servicesImports = await getServicesImports(options.servicesDirs as ServicesDirs)
    await addServicesImports(servicesImports)

    setAuthDefaults(options, servicesImports, nuxt)
*/
