import type { CommonTransportOptions } from '.'
import defu from 'defu'
import { checkPath } from './utils'

export interface WebsocketCorsOptions {
  origin?: boolean | string | string[]
  credentials?: boolean
  methods?: string[]
}

export interface WebsocketOptions extends CommonTransportOptions {
  connectTimeout?: number
  transports?: Array<'websocket' | 'polling'>
  cors?: WebsocketCorsOptions
}

export interface ResolvedWebsocketOptions extends CommonTransportOptions {
  path: string
  connectTimeout: number
  transports: Array<'websocket' | 'polling'>
  cors?: WebsocketCorsOptions
}

export type ResolvedWebsocketOptionsOrDisabled = ResolvedWebsocketOptions | false

export const websocketDefaults: ResolvedWebsocketOptions = {
  path: '/socket.io',
  connectTimeout: 45000, // socket.io default
  transports: ['websocket'],
}

export function resolveWebsocketTransportsOptions(websocket: WebsocketOptions | boolean | undefined): ResolvedWebsocketOptionsOrDisabled {
  let resolvedWebsocket: ResolvedWebsocketOptionsOrDisabled = false

  if (websocket === true || websocket === undefined) {
    resolvedWebsocket = websocketDefaults
  }
  else if (websocket !== false) {
    resolvedWebsocket = defu(websocket, websocketDefaults)
    if (resolvedWebsocket)
      checkPath(resolvedWebsocket.path)
  }

  return resolvedWebsocket
}
