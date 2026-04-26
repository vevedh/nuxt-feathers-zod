import type { FeathersClientPlugin } from '../client'

export interface RemoteServiceDescriptor {
  path: string
  methods?: string[]
}

export interface NfzClientPluginConfig {
  authEnabled: boolean
  piniaEnabled: boolean
  services: FeathersClientPlugin[]
  plugins: FeathersClientPlugin[]
  remoteServices: RemoteServiceDescriptor[]
  piniaOptions?: Record<string, unknown> | false
  debug?: boolean
}
