import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readManifest, resolveSchemaFile, writeManifestFields } from './nfzSchema'

const temporaryRoots: string[] = []

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), 'nfz-schema-'))
  temporaryRoots.push(root)
  return root
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

describe('nfz schema paths', () => {
  it('resolves schemas from an absolute services directory without falling back to a repository scan', () => {
    const root = createRoot()
    const servicesDir = join(root, 'services')
    const serviceDir = join(servicesDir, 'users')
    const schemaFile = join(serviceDir, 'users.schema.ts')

    mkdirSync(serviceDir, { recursive: true })
    writeFileSync(schemaFile, 'export const userSchema = z.object({ rootOnly: z.string(), })\n')

    expect(resolveSchemaFile(root, [servicesDir], 'users')).toEqual({
      schemaFile,
      servicesDirResolved: servicesDir,
    })
  })

  it('reads and writes manifests inside an absolute services directory', () => {
    const root = createRoot()
    const servicesDir = join(root, 'services')

    writeManifestFields(root, [servicesDir], 'users', {
      email: { type: 'string', required: true },
    })

    const { manifest, manifestPath } = readManifest(root, [servicesDir])
    expect(manifestPath).toBe(join(servicesDir, '.nfz', 'manifest.json'))
    expect(manifest.services.users.fields.email.type).toBe('string')
    expect(JSON.parse(readFileSync(manifestPath!, 'utf8')).services.users).toBeTruthy()
  })
})
