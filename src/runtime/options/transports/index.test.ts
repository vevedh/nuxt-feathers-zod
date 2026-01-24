import type { TransportsOptions } from './index'
import { describe, expect, it } from 'vitest'
import { NuxtFeathersError } from '../../errors'
import { resolveTransportsOptions } from './index'
import { restDefaults } from './rest'
import { websocketDefaults } from './websocket'

describe('resolveTransportsOptions', () => {
  it('should throw an error if no transport is selected', () => {
    const transports = { rest: false, websocket: false }

    // @ts-expect-error - test wrong transport options
    expect(() => resolveTransportsOptions(transports, false)).toThrow(NuxtFeathersError)
  })

  it('should resolve rest transport options', () => {
    const transports: TransportsOptions = { rest: true, websocket: false }

    const resolvedOptions = resolveTransportsOptions(transports, false)

    expect(resolvedOptions.rest).toEqual(restDefaults)
    expect(resolvedOptions.websocket).toEqual(false)
  })

  it('should resolve websocket transport options', () => {
    const transports: TransportsOptions = { rest: false, websocket: true }

    const resolvedOptions = resolveTransportsOptions(transports, false)

    expect(resolvedOptions.rest).toEqual(false)
    expect(resolvedOptions.websocket).toEqual(websocketDefaults)
  })

  it('should resolve both rest and websocket transport options', () => {
    const transports: TransportsOptions = { rest: true, websocket: true }

    const resolvedOptions = resolveTransportsOptions(transports, false)

    expect(resolvedOptions.rest).toEqual(restDefaults)
    expect(resolvedOptions.websocket).toEqual(websocketDefaults)
  })

  it('should resolve rest and websocket if default transports options and ssr is enabled', () => {
    const transports = { rest: undefined, websocket: true }

    const resolvedOptions = resolveTransportsOptions(transports, true)

    expect(resolvedOptions.rest).toEqual(restDefaults)
    expect(resolvedOptions.websocket).toEqual(websocketDefaults)
  })

  it('should resolve websocket only if default transports options and ssr is disabled', () => {
    const transports = { rest: undefined, websocket: true }

    const resolvedOptions = resolveTransportsOptions(transports, false)

    expect(resolvedOptions.rest).toEqual(false)
    expect(resolvedOptions.websocket).toEqual(websocketDefaults)
  })
})
