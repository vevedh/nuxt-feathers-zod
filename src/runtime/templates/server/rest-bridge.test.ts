import { describe, expect, it } from 'vitest'
import { templatesDefaults } from '../../options/templates'
import { isKeyAllowed } from '../overrides'
import { getServerTemplates } from './index'
import { getServerRestBridgeContents } from './rest-bridge'

describe('generated Express REST bridge', () => {
  it('emits parseable JavaScript with JSDoc contracts and explicit runtime states', () => {
    const source = getServerRestBridgeContents({
      transports: { rest: { framework: 'express', path: '/feathers' } },
    } as any)()

    expect(source).toContain('// @ts-check')
    expect(source).toContain('@param {string | null | undefined} value')
    expect(source).toContain('function ensureLeadingSlash(value)')
    expect(source).toContain('const done = (error) =>')
    expect(source).toContain("res.off('finish', done)")
    expect(source).toContain('sendJson(event, 503')
    expect(source).toContain('sendJson(event, 404')
    expect(source).toContain('req.url = originalUrl')
    expect(source).toContain('req.originalUrl = originalOriginalUrl')
    expect(source).toContain('export default defineEventHandler(handleRestBridge)')
    expect(source).not.toContain('interface JsonPayload')
    expect(source).not.toContain('new Promise<void>')
  })

  it('registers the generated bridge as an ESM server template', () => {
    const templates = getServerTemplates({
      transports: { rest: { framework: 'express', path: '/feathers' } },
      database: { connections: {} },
    } as any)

    expect(templates.some(template => template.filename === 'feathers/server/rest-bridge.mjs')).toBe(true)
    expect(templates.some(template => template.filename === 'feathers/server/rest-bridge.ts')).toBe(false)
    expect(isKeyAllowed('server/rest-bridge.mjs', templatesDefaults.allow)).toBe(true)
  })
})
