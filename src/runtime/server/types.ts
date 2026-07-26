export type MaybePromise<T> = T | Promise<T>

export type NfzRegistrarPhase = 'plugins' | 'services'
export type NfzDuplicateServicePolicy = 'error' | 'skip'

export interface NfzNamedRegistrar {
  handler(app: any): unknown
  label: string
  /** Absolute or package-relative source used only for safe diagnostics. */
  source?: string
  /** Required by default. Set false only for an explicitly optional registrar. */
  required?: boolean
}

export interface NfzSkippedRegistrar {
  label: string
  source?: string
  phase: NfzRegistrarPhase
  reason: 'database-infrastructure-unavailable' | 'duplicate-service'
  servicePath?: string
}

export interface NfzServiceRegistration {
  path: string
  label: string
  source?: string
  phase: NfzRegistrarPhase
}

export interface NfzDuplicateServiceDiagnostic {
  path: string
  policy: NfzDuplicateServicePolicy
  first: NfzServiceRegistration
  second: NfzServiceRegistration
}

export interface NfzNamedModule {
  handler(app: any, context: any): unknown
  label: string
  source?: string
  moduleOptions?: unknown
}

export interface NfzServerBootstrapConfig {
  instanceId?: string
  config: any
  createApp(nitroApp: any, config: any): Promise<any>
  configureInfrastructure(app: any, config: any): Promise<void>
  initSwagger?(app: any, config: any): MaybePromise<unknown>
  initKeycloak?(app: any, config: any): MaybePromise<unknown>
  expressErrorHandler?(app: any): unknown
  createRouters(app: any): MaybePromise<void>
  loadOrder: string[]
  preModules: NfzNamedModule[]
  postModules: NfzNamedModule[]
  plugins: NfzNamedRegistrar[]
  services: NfzNamedRegistrar[]
  debug?: boolean
}

export interface NfzInfrastructureHandlers {
  authentication?: ((app: any) => unknown) | undefined
  database?: ((app: any, config: any) => unknown) | undefined
}
