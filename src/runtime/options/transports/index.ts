import type { ResolvedRestOptionsOrDisabled, RestOptions } from './rest'
import type { ResolvedWebsocketOptionsOrDisabled, WebsocketOptions } from './websocket'
import { NuxtFeathersError } from '../../errors'
import { resolveRestTransportsOptions } from './rest'
import { resolveWebsocketTransportsOptions } from './websocket'

export interface CommonTransportOptions {
  path?: string
}

export type TransportsOptions = {
  rest: RestOptions | true
  websocket?: WebsocketOptions | boolean
} | {
  rest?: RestOptions | boolean
  websocket: WebsocketOptions | true
} | {
  rest?: never
  websocket: false
} | {
  rest: false
  websocket?: never
}

export interface ResolvedTransportsOptions {
  rest: ResolvedRestOptionsOrDisabled
  websocket: ResolvedWebsocketOptionsOrDisabled
}

export function resolveTransportsOptions(transports: TransportsOptions, ssr: boolean): ResolvedTransportsOptions {
  const rest = resolveRestTransportsOptions(transports.rest, transports.websocket !== false, ssr)
  const websocket = resolveWebsocketTransportsOptions(transports.websocket)

  if (!rest && !websocket)
    throw new NuxtFeathersError('No transport selected. Must be enable one of rest or websocket transport.')

  const resolvedTransportsOptions: ResolvedTransportsOptions = {
    rest,
    websocket,
  }

  return resolvedTransportsOptions
}
