import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const read = file => readFileSync(resolve(root, file), 'utf8')
const failures = []

function requireFragment(file, fragment, reason) {
  if (!read(file).includes(fragment))
    failures.push(`${file}: ${reason}`)
}

requireFragment('src/runtime/server/instance-registry.ts', 'claimNfzRuntimeInstance', 'atomic runtime claim is missing')
requireFragment('src/runtime/server/bootstrap.ts', "instance.status === 'initializing'", 'concurrent bootstrap wait is missing')
requireFragment('src/runtime/server/bootstrap.ts', 'nfzDuplicateServiceRegistrations', 'duplicate service diagnostics are missing')
requireFragment('src/runtime/server/bootstrap.ts', "duplicateServicePolicy === 'skip'", 'explicit duplicate skip policy is missing')
requireFragment('src/runtime/templates/server/rest-bridge.ts', "sendJson(event, 503", 'REST bootstrap 503 JSON handling is missing')
requireFragment('src/runtime/templates/server/rest-bridge.ts', "sendJson(event, 404", 'REST Feathers JSON 404 handling is missing')
requireFragment('src/runtime/templates/server/index.ts', "filename: 'feathers/server/rest-bridge.mjs'", 'REST bridge must be emitted as parseable ESM')
requireFragment('src/setup/apply-server-layer.ts', "endsWith('server/rest-bridge.mjs')", 'REST bridge ESM handler registration is missing')
requireFragment('src/setup/apply-server-layer.ts', 'route: normalizedRestPath,', 'exact REST prefix handler is missing')
requireFragment('src/runtime/templates/server/plugin.ts', 'source:', 'registrar provenance is missing from generated plugin')
requireFragment('src/runtime/options/server.ts', "duplicateServicePolicy?: 'error' | 'skip'", 'public duplicate policy option is missing')
requireFragment('test/unit/server-bootstrap.test.ts', 'executes concurrent and ready re-invocations only once', 'bootstrap idempotence regression test is missing')
requireFragment('test/unit/server-bootstrap.test.ts', 'reports both registrar sources for duplicate service paths', 'duplicate source regression test is missing')
requireFragment('src/runtime/options/plugins.test.ts', 'normalizes Windows separators, casing, and module extensions', 'Windows plugin dedupe regression test is missing')

const starterTsconfig = read('examples/nfz-quasar-unocss-pinia-starter/tsconfig.json')
if (/\.nuxt\/feathers|\.nuxt\\\\feathers/.test(starterTsconfig) && /exclude/.test(starterTsconfig))
  failures.push('starter tsconfig excludes generated .nuxt/feathers files')

if (failures.length) {
  console.error('[embedded-runtime-reliability] failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}



function resolveTsc() {
  const candidates = [
    () => require.resolve('typescript/bin/tsc'),
    () => require.resolve('typescript/bin/tsc', { paths: ['/opt/nvm/versions/node/v22.16.0/lib/node_modules'] }),
  ]
  for (const candidate of candidates) {
    try {
      return candidate()
    }
    catch {}
  }
  return process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
}

const tsc = resolveTsc()
const tscArgs = [
  '--strict',
  '--noImplicitAny',
  '--noEmit',
  '--target', 'ES2022',
  '--module', 'ESNext',
  '--moduleResolution', 'Bundler',
  '--skipLibCheck',
  '--lib', 'ES2022,DOM',
  'src/runtime/server/types.ts',
  'src/runtime/server/instance-registry.ts',
  'src/runtime/server/bootstrap.ts',
]
try {
  const command = existsSync(tsc) ? process.execPath : tsc
  const args = existsSync(tsc) ? [tsc, ...tscArgs] : tscArgs
  execFileSync(command, args, { cwd: root, stdio: 'inherit' })
}
catch (error) {
  console.error('[embedded-runtime-reliability] strict runtime compilation failed.')
  throw error
}

console.log('[embedded-runtime-reliability] embedded runtime invariants and strict compilation passed.')
