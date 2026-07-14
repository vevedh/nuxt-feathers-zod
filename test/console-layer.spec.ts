import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { NFZ_MODULE_CAPABILITIES } from '../src/runtime/capabilities'
import { NFZ_CONSOLE_SERVICE_PATHS } from '../src/runtime/server/console-services'
import { NFZ_CONSOLE_SERVER_HANDLERS } from '../src/setup/apply-console-layer'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

function runtimeFile(runtimePath: string) {
  return path.join(root, 'src', 'runtime', `${runtimePath}.ts`)
}

describe('nfz console compatibility layer', () => {
  it('keeps every deprecated Nitro facade unique', () => {
    const keys = NFZ_CONSOLE_SERVER_HANDLERS.map(spec => `${spec.method.toUpperCase()} ${spec.route}`)

    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(expect.arrayContaining([
      'GET /api/nfz/services',
      'GET /api/nfz/manifest',
      'POST /api/nfz/manifest',
      'GET /api/nfz/schema',
      'POST /api/nfz/schema',
      'GET /api/nfz/schema/:service',
      'POST /api/nfz/schema/:service',
      'POST /api/nfz/preview',
      'POST /api/nfz/apply',
    ]))
  })

  it('points every facade to a concrete runtime handler', () => {
    for (const spec of NFZ_CONSOLE_SERVER_HANDLERS)
      expect(fs.existsSync(runtimeFile(spec.runtimePath)), spec.runtimePath).toBe(true)
  })

  it('keeps the playground on the module-provided Feathers services', () => {
    const config = fs.readFileSync(path.join(root, 'playground/nuxt.config.ts'), 'utf8')

    expect(config).toMatch(/console:\s*\{[\s\S]*enabled:\s*true/)
    expect(config).not.toContain('playground/server/api/nfz')
    expect(fs.existsSync(path.join(root, 'playground/server/api/nfz'))).toBe(false)
  })

  it('keeps compatibility routes optional', () => {
    const source = fs.readFileSync(path.join(root, 'src/setup/apply-console-layer.ts'), 'utf8')
    expect(source).toContain('legacyNitroRoutes === false')
  })

  it('delegates legacy handlers to Feathers services', () => {
    const source = fs.readFileSync(runtimeFile('server/api/nfz/schema.get'), 'utf8')
    expect(source).toContain('callNfzConsoleService')
    expect(source).toContain('NFZ_CONSOLE_SERVICE_PATHS.schemas')
    expect(source).not.toContain('getServiceInfo')
  })
  it('keeps the capability matrix aligned with the registered NFZ service paths', () => {
    const expectedPaths = Object.values(NFZ_CONSOLE_SERVICE_PATHS).sort()
    const capabilityPaths = NFZ_MODULE_CAPABILITIES.consoleServices.map(service => service.path).sort()

    expect(capabilityPaths).toEqual(expectedPaths)
  })

  it('does not ship the obsolete Nitro-driven console page source', () => {
    expect(fs.existsSync(path.join(root, 'src/runtime/console/pages'))).toBe(false)
  })
})
