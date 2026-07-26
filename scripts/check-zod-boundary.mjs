import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const starter = JSON.parse(readFileSync(resolve(root, 'examples/nfz-quasar-unocss-pinia-starter/package.json'), 'utf8'))
const lock = readFileSync(resolve(root, 'bun.lock'), 'utf8')
const aliasesSetup = readFileSync(resolve(root, 'src/setup/apply-aliases.ts'), 'utf8')
const nitroInlineHelper = readFileSync(resolve(root, 'src/setup/internals/ensure-nitro-inline.ts'), 'utf8')
const starterConfig = readFileSync(resolve(root, 'examples/nfz-quasar-unocss-pinia-starter/nuxt.config.ts'), 'utf8')
const failures = []

const majorRange = value => typeof value === 'string' && /^\^?3(?:\.|$)/.test(value)
if (pkg.dependencies?.zod)
  failures.push('zod must not be bundled as a package dependency; it is a shared runtime peer')
if (!majorRange(pkg.peerDependencies?.zod))
  failures.push(`peerDependencies.zod must explicitly support Zod 3, received ${pkg.peerDependencies?.zod || '(missing)'}`)
if (!majorRange(pkg.devDependencies?.zod))
  failures.push(`devDependencies.zod must provide the tested Zod 3 runtime, received ${pkg.devDependencies?.zod || '(missing)'}`)
if (!majorRange(starter.dependencies?.zod))
  failures.push(`starter dependencies.zod must stay on Zod 3, received ${starter.dependencies?.zod || '(missing)'}`)
if (!lock.includes('"zod": "^3.25.76"') || !lock.includes('"zod": "3.25.76"'))
  failures.push('bun.lock root peer/dev Zod declarations are not synchronized')

if (!aliasesSetup.includes("ensureNitroDependencyInline(nitroConfig, 'zod')"))
  failures.push('the Nuxt module must inline the application-shared Zod runtime in Nitro output')
if (!nitroInlineHelper.includes('nitroConfig.externals.inline = inline'))
  failures.push('Nitro Zod inlining must preserve and update the externals.inline contract')
if (!/nitro:\s*\{[\s\S]*?externals:\s*\{[\s\S]*?inline:\s*\[[\s\S]*?['"]zod['"]/.test(starterConfig))
  failures.push('the packaged starter must explicitly inline Zod in its Nitro production bundle')

for (const file of [
  'src/runtime/zod/query.ts',
  'src/runtime/zod/validators.ts',
  'src/runtime/server/console-services.ts',
]) {
  const source = readFileSync(resolve(root, file), 'utf8')
  if (!/from ['"]zod['"]/.test(source))
    failures.push(`${file} must consume the application-shared zod runtime`)
}

if (failures.length) {
  console.error('[zod-boundary] failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}
console.log('[zod-boundary] Zod 3 peer/runtime boundary is coherent.')
