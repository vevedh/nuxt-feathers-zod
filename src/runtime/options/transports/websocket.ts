import type { CommonTransportOptions } from '.'
import defu from 'defu'
import { checkPath } from './utils'

export interface WebsocketOptions extends CommonTransportOptions {
  connectTimeout?: number
}

export type ResolvedWebsocketOptions = Required<WebsocketOptions>

export type ResolvedWebsocketOptionsOrDisabled = ResolvedWebsocketOptions | false

export const websocketDefaults: ResolvedWebsocketOptions = {
  path: '/socket.io',
  connectTimeout: 45000, // default settings for socket.io
}

export function resolveWebsocketTransportsOptions(websocket: WebsocketOptions | boolean | undefined): ResolvedWebsocketOptionsOrDisabled {
  let resolvedWebsocket: ResolvedWebsocketOptionsOrDisabled = false

  if (websocket === true || websocket === undefined) {
    resolvedWebsocket = websocketDefaults
  }
  else if (websocket !== false) {
    resolvedWebsocket = defu(websocket, websocketDefaults)
    checkPath(resolvedWebsocket.path)
  }

  return resolvedWebsocket
}
