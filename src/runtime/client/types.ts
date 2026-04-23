import type { CreatePiniaClientConfig } from 'feathers-pinia'

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
  piniaOptions?: CreatePiniaClientConfig | Record<string, unknown> | false
  debug?: boolean
}
