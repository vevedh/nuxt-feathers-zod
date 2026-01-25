import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

function read(relPath: string) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

describe('playground swagger smoke-test', () => {
  it('enables module flag feathers.swagger in playground', () => {
    const cfg = read('playground/nuxt.config.ts')
    expect(cfg).toMatch(/swagger:\s*true/)
  })

  it('includes a service with legacy swagger docs block', () => {
    const svc = read('services/swagger-tests/swagger-tests.ts')
    expect(svc).toMatch(/docs:\s*\{/)
    expect(svc).toMatch(/definitions:\s*\{/)
  })
})
