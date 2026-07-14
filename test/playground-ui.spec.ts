import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

describe('playground validation center', () => {
  it('loads the shared stylesheet and publishes the module version', () => {
    const config = read('playground/nuxt.config.ts')
    expect(config).toMatch(/css:\s*\['~\/assets\/css\/playground\.css'\]/)
    expect(config).toMatch(/moduleVersion:\s*modulePackage\.version/)
  })

  it('keeps a single responsive layout with grouped navigation', () => {
    const layout = read('playground/app/layouts/default.vue')
    const navigation = read('playground/app/composables/usePlaygroundNavigation.ts')
    expect(layout).toContain('nfz-sidebar')
    expect(layout).toContain('nfz-mobile-header')
    expect(navigation).toContain('Parcours principal')
    expect(navigation).toContain('Fonctions métier')
    expect(navigation).toContain('Runtime et transports')
  })

  it('offers non-destructive quick checks from the dashboard', () => {
    const dashboard = read('playground/app/pages/index.vue')
    expect(dashboard).toContain('runQuickChecks')
    expect(dashboard).toContain('builder.getStatus')
    expect(dashboard).toContain('builder.getServices')
    expect(dashboard).toMatch(/client\.service\(['"]mongos['"]\)\.find/)
  })

  it('keeps technical payloads behind reusable JSON panels', () => {
    const testsPage = read('playground/app/pages/tests.vue')
    const jsonPanel = read('playground/app/components/PlaygroundJsonPanel.vue')
    expect(testsPage).toContain('PlaygroundJsonPanel')
    expect(jsonPanel).toContain('Copier le JSON')
    expect(jsonPanel).toContain('JSON.stringify')
  })
  it('keeps Builder and RBAC consoles on canonical Feathers NFZ services', () => {
    const builder = read('playground/app/pages/console/builder.vue')
    const rbac = read('playground/app/pages/console/rbac.vue')

    for (const source of [builder, rbac]) {
      expect(source).toContain('useBuilderClient()')
      expect(source).not.toContain('/api/nfz')
    }

    expect(builder).toContain('builder.getServices')
    expect(builder).toContain('builder.getSchema')
    expect(builder).toContain('builder.saveSchema')
    expect(builder).toContain('service?.name')
    expect(rbac).toContain('builder.getServices')
    expect(rbac).toContain('builder.getRbac')
    expect(rbac).toContain('builder.saveRbac')
  })

  it('documents every playground navigation route', () => {
    const navigation = read('playground/app/composables/usePlaygroundNavigation.ts')
    const guide = read('docs/guide/playground.md')
    const routes = Array.from(navigation.matchAll(/\bto:\s*'([^']+)'/g), match => match[1])

    expect(routes.length).toBeGreaterThan(10)
    for (const route of routes)
      expect(guide).toContain(`\`${route}\``)
  })
})
