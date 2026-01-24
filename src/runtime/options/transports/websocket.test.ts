import { describe, expect, it, vi } from 'vitest'
import { checkPath } from './utils'
import { resolveWebsocketTransportsOptions, websocketDefaults } from './websocket'

vi.mock('./utils', () => ({
  checkPath: vi.fn(),
}))

describe('resolveWebsocketTransportsOptions', () => {
  it('should return websocketDefaults if websocket is true', () => {
    const websocket = true

    const result = resolveWebsocketTransportsOptions(websocket)

    expect(result).toEqual(websocketDefaults)
  })

  it('should return websocketDefaults if websocket is undefined', () => {
    const websocket = undefined

    const result = resolveWebsocketTransportsOptions(websocket)

    expect(result).toEqual(websocketDefaults)
  })

  it('should return false if websocket is false', () => {
    const websocket = false

    const result = resolveWebsocketTransportsOptions(websocket)

    expect(result).toEqual(false)
  })

  it('should return merged options if websocket is an object', () => {
    const websocket = {
      path: '/custom-path',
    }

    const result = resolveWebsocketTransportsOptions(websocket)

    expect(result).toEqual({
      path: '/custom-path',
      connectTimeout: websocketDefaults.connectTimeout,
    })

    expect(checkPath).toHaveBeenCalledWith('/custom-path')
  })
})
