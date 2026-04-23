export interface NfzNamedRegistrar {
  handler: (app: any) => unknown
  label: string
}

export interface NfzNamedModule {
  handler: (app: any, context: any) => unknown
  label: string
  moduleOptions?: unknown
}

export interface NfzServerBootstrapConfig {
  config: any
  createApp: (nitroApp: any, config: any) => Promise<any>
  configureInfrastructure: (app: any, config: any) => Promise<void>
  initSwagger?: (app: any) => unknown
  initKeycloak?: (app: any) => unknown
  expressErrorHandler?: (app: any) => unknown
  createRouters: (app: any) => void
  loadOrder: string[]
  preModules: NfzNamedModule[]
  postModules: NfzNamedModule[]
  plugins: NfzNamedRegistrar[]
  services: NfzNamedRegistrar[]
  debug?: boolean
}

export interface NfzInfrastructureHandlers {
  authentication?: ((app: any) => unknown) | undefined
  mongodb?: ((app: any) => unknown) | undefined
}
