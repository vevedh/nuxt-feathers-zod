import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { feathers } from '@feathersjs/feathers'
import { afterEach, describe, expect, it } from 'vitest'
import {
  NFZ_CONSOLE_SERVICE_PATHS,
  registerNfzConsoleServices,
  resolveNfzConsoleServiceContext,
} from './console-services'

const roots: string[] = []

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'nfz-console-services-'))
  roots.push(root)
  writeFileSync(join(root, 'package.json'), '{"name":"fixture","private":true}\n')
  const serviceDir = join(root, 'services', 'pings')
  mkdirSync(serviceDir, { recursive: true })
  writeFileSync(join(serviceDir, 'pings.schema.ts'), `
import { z } from 'zod'
export const pingSchema = z.object({
  id: z.number().int(),
  label: z.string(),
})
`)
  return { root, servicesDir: join(root, 'services') }
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

describe('feathers-first NFZ console services', () => {
  it('registers the canonical service surface and resolves schemas directly', async () => {
    const fixture = createFixture()
    const app = feathers()
    registerNfzConsoleServices(app, {
      console: { enabled: true, allowWrite: false, servicesDirs: [fixture.servicesDir] },
      auth: false,
      keycloak: false,
    })

    const discovery = await app.service(NFZ_CONSOLE_SERVICE_PATHS.services).find()
    expect(discovery.services).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'pings' }),
    ]))

    const schema = await app.service(NFZ_CONSOLE_SERVICE_PATHS.schemas).get('pings')
    expect(schema.service).toBe('pings')
    expect(schema.fields.label).toEqual(expect.objectContaining({ type: 'string' }))

    const preview = await app.service(NFZ_CONSOLE_SERVICE_PATHS.builder).create({
      action: 'preview',
      service: 'pings',
      fields: schema.fields,
    })
    expect(preview.ok).toBe(true)
    expect(preview.after.fields.label).toBeTruthy()
  })

  it('rejects unsafe identifiers and write operations in read-only mode', async () => {
    const fixture = createFixture()
    const app = feathers()
    registerNfzConsoleServices(app, {
      console: { enabled: true, allowWrite: false, servicesDirs: [fixture.servicesDir] },
      auth: false,
      keycloak: false,
    })

    await expect(app.service(NFZ_CONSOLE_SERVICE_PATHS.schemas).get('../secrets')).rejects.toMatchObject({
      name: 'BadRequest',
    })

    await expect(app.service(NFZ_CONSOLE_SERVICE_PATHS.schemas).patch('pings', {
      fields: { label: { type: 'string' } },
    })).rejects.toMatchObject({
      name: 'Forbidden',
    })
  })

  it('rejects prototype-pollution keys before Zod parsing', async () => {
    const fixture = createFixture()
    const app = feathers()
    registerNfzConsoleServices(app, {
      console: { enabled: true, allowWrite: false, servicesDirs: [fixture.servicesDir] },
      auth: false,
      keycloak: false,
    })

    const payload = JSON.parse('{"action":"preview","preset":"mongo+local-auth+users+seed","params":{"__proto__":{"polluted":true}}}')
    await expect(app.service(NFZ_CONSOLE_SERVICE_PATHS.builder).create(payload)).rejects.toMatchObject({
      name: 'BadRequest',
    })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('derives the project root from an absolute services directory', () => {
    const fixture = createFixture()
    const context = resolveNfzConsoleServiceContext({
      console: { enabled: true, servicesDirs: [fixture.servicesDir] },
    })

    expect(context.projectRoot).toBe(fixture.root)
    expect(context.servicesDirs).toEqual([fixture.servicesDir])
  })
})
