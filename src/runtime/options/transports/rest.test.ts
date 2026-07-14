import type { RestOptions } from './rest'
import { describe, expect, it, vi } from 'vitest'
import { resolveRestTransportsOptions, restDefaults } from './rest'
import * as utils from './utils'

describe('resolveRestTransportsOptions', () => {
  it('should return restDefaults if rest is true', () => {
    const rest = true
    const websocket = false
    const ssr = true

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual(restDefaults)
  })

  it('should return restDefaults if rest is undefined', () => {
    const rest = undefined
    const websocket = false
    const ssr = true

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual(restDefaults)
  })

  it('should return restDefaults if rest is true and SSR is disabled', () => {
    const rest = true
    const websocket = false
    const ssr = false

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual(restDefaults)
  })

  it('should return restDefaults if rest is undefined and websocket is disabled', () => {
    const rest = undefined
    const websocket = false
    const ssr = true

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual(restDefaults)
  })

  it('should return restDefaults if rest is undefined, websocket is enabled and SSR is disabled', () => {
    const rest = undefined
    const websocket = false
    const ssr = false

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual(restDefaults)
  })

  it('should keep REST enabled by default if rest is undefined and websocket is enabled and ssr is disabled', () => {
    const rest = undefined
    const websocket = true
    const ssr = false

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual(restDefaults)
  })

  it('should return false if rest is false and websocket is enabled and SSR is disabled', () => {
    const rest = false
    const websocket = true
    const ssr = false

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual(false)
  })

  it('should return merged options if rest is an object', () => {
    const spy = vi.spyOn(utils, 'checkPath')
    const rest: RestOptions = {
      path: '/custom-path',
    }
    const websocket = true
    const ssr = false

    const result = resolveRestTransportsOptions(rest, websocket, ssr)

    expect(result).toEqual({
      path: '/custom-path',
      framework: restDefaults.framework,
    })
    expect(spy).toHaveBeenCalledWith('/custom-path')
    spy.mockRestore()
  })
})
