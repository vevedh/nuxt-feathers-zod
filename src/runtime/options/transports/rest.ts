import type { CommonTransportOptions } from '.'
import defu from 'defu'
import { checkPath } from './utils'

export type Framework = 'koa' | 'express'

export interface RestOptions extends CommonTransportOptions {
  framework?: Framework
}

export type ResolvedRestOptions = Required<RestOptions>

export type ResolvedRestOptionsOrDisabled = ResolvedRestOptions | false

export const restDefaults: ResolvedRestOptions = {
  path: '/feathers',
  framework: 'koa',
}

// eslint-disable-next-line style/max-len
function getRestDefaults(rest: RestOptions | boolean | undefined, websocket: boolean, ssr: boolean): ResolvedRestOptionsOrDisabled {
  if (rest === true || !websocket || ssr)
    return restDefaults
  else
    return false
}

export function resolveRestTransportsOptions(rest: RestOptions | boolean | undefined, websocket: boolean, ssr: boolean): ResolvedRestOptionsOrDisabled {
  let resolvedRest: ResolvedRestOptionsOrDisabled = false

  if (rest === true || typeof rest === 'undefined') {
    resolvedRest = getRestDefaults(rest, websocket, ssr)
  }
  else if (rest !== false) {
    resolvedRest = defu(rest, restDefaults)
    checkPath(resolvedRest.path)
  }

  return resolvedRest
}
