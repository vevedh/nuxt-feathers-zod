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
    expect(dashboard).toContain('Diagnostic serveur protégé')
    expect(dashboard).toContain('Découverte des services protégée')
  })

  it('restores a session without making playground diagnostics private', () => {
    const middleware = read('playground/app/middleware/session.global.ts')

    expect(middleware).toContain('auth.reAuthenticate().catch')
    expect(middleware).not.toContain('navigateTo(')
  })

  it('keeps SSR and the auth dashboard deterministic during hydration', () => {
    const config = read('playground/nuxt.config.ts')
    const dashboard = read('playground/app/pages/index.vue')

    expect(config).not.toMatch(/routeRules:\s*\{[\s\S]*['"]\/['"]:\s*\{\s*ssr:\s*false\s*\}/)
    expect(config).toContain('ssr: true')
    expect(dashboard).not.toContain('definePageMeta({ ssr: false })')
    expect(dashboard).toContain('const sessionUiReady = ref(false)')
    expect(dashboard).toContain('const displayAuthenticated = computed(() => sessionUiReady.value && isAuthenticated.value)')
    expect(dashboard).toContain('v-if="!sessionUiReady"')
    expect(dashboard).toContain('Initialisation de la session…')
    expect(dashboard).toMatch(/onMounted\(async \(\) => \{[\s\S]*?await auth\.init\(\)[\s\S]*?catch \(error\) \{[\s\S]*?authError\.value = errorMessage\(error\)[\s\S]*?finally \{[\s\S]*?sessionUiReady\.value = true/)
    expect(dashboard).toContain('displayAuthenticated ? \'Session active\' : \'Session anonyme\'')
  })

  it('keeps technical payloads behind reusable JSON panels', () => {
    const testsPage = read('playground/app/pages/tests.vue')
    const jsonPanel = read('playground/app/components/PlaygroundJsonPanel.vue')
    expect(testsPage).toContain('PlaygroundJsonPanel')
    expect(jsonPanel).toContain('Copier le JSON')
    expect(jsonPanel).toContain('JSON.stringify')
  })

  it('keeps the mongos page on the direct Feathers service contract', () => {
    const mongos = read('playground/app/pages/mongos.vue')

    expect(mongos).toContain('useService(\'mongos\')')
    expect(mongos).toMatch(/service\.find\(/)
    expect(mongos).toContain('useNfzPinia()')
    expect(mongos).not.toMatch(/\.use(?:Find|Get|Create|Update|Patch|Remove)\s*(?:<|\()/)
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
    const frenchGuide = read('docs/guide/playground.md')
    const englishGuide = read('docs/en/guide/playground.md')
    const routes = Array.from(navigation.matchAll(/\bto:\s*'([^']+)'/g), match => match[1])

    expect(routes.length).toBeGreaterThan(10)
    for (const route of routes) {
      expect(frenchGuide).toContain(`\`${route}\``)
      expect(englishGuide).toContain(`\`${route}\``)
    }
  })
})
