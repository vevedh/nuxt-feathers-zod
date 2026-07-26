import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = resolve(import.meta.dirname, '..')
const sourceFile = resolve(root, 'src/runtime/templates/server/rest-bridge.ts')
const require = createRequire(import.meta.url)

function resolveTypeScript() {
  const candidates = [
    () => require.resolve('typescript'),
    () => require.resolve('typescript', { paths: ['/opt/nvm/versions/node/v22.16.0/lib/node_modules'] }),
  ]
  for (const candidate of candidates) {
    try {
      return candidate()
    }
    catch {}
  }
  throw new Error('TypeScript is required to validate generated NFZ templates.')
}

function resolveTsc(tsModulePath) {
  const candidate = resolve(dirname(tsModulePath), '../bin/tsc')
  if (existsSync(candidate))
    return candidate
  return process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
}

const tsModulePath = resolveTypeScript()
const ts = require(tsModulePath)
const source = readFileSync(sourceFile, 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: sourceFile,
}).outputText

const module = { exports: {} }
vm.runInNewContext(transpiled, {
  module,
  exports: module.exports,
  require,
  console,
}, { filename: sourceFile })

const getContents = module.exports.getServerRestBridgeContents
if (typeof getContents !== 'function')
  throw new TypeError('Unable to load getServerRestBridgeContents().')

const generated = getContents({
  transports: {
    rest: { framework: 'express', path: '/feathers' },
  },
})()

const requiredFragments = [
  '// @ts-check',
  '@param {string | null | undefined} value',
  'function ensureLeadingSlash(value)',
  'function rewriteLegacyMongoAliases(pathname)',
  'function stripRestPrefix(url)',
  'await new Promise(',
  'const done = (error) =>',
  "res.off('finish', done)",
  "res.off('close', done)",
  "className: 'unavailable'",
  "className: 'not-found'",
  'export default defineEventHandler(handleRestBridge)',
]
for (const fragment of requiredFragments) {
  if (!generated.includes(fragment))
    throw new Error(`Generated REST bridge is missing JavaScript/runtime fragment: ${fragment}`)
}

const forbiddenFragments = [
  'interface JsonPayload',
  'interface ErrorLike',
  'new Promise<void>',
  'catch (error: unknown)',
  'event: any',
]
for (const fragment of forbiddenFragments) {
  if (generated.includes(fragment))
    throw new Error(`Generated REST bridge still contains TypeScript-only syntax: ${fragment}`)
}

const work = mkdtempSync(join(tmpdir(), 'nfz-generated-strict-'))
try {
  const generatedFile = join(work, 'rest-bridge.mjs')
  writeFileSync(generatedFile, generated)
  writeFileSync(join(work, 'types.d.ts'), `
declare module 'nuxt-feathers-zod/server-instance-registry' {
  export interface RuntimeInstance {
    status: 'initializing' | 'ready' | 'failed' | 'closing' | 'closed'
    app?: unknown
    failureId?: string
  }
  export function getNfzRuntimeInstance(id?: string): RuntimeInstance | undefined
}
declare module 'h3' {
  export function defineEventHandler<T>(handler: T): T
}
`)
  writeFileSync(join(work, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      noImplicitAny: true,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      skipLibCheck: true,
      lib: ['ES2022', 'DOM'],
    },
    files: ['types.d.ts', 'rest-bridge.mjs'],
  }, null, 2))

  execFileSync(process.execPath, ['--check', generatedFile], {
    cwd: work,
    stdio: 'inherit',
  })

  execFileSync(process.execPath, [resolveTsc(tsModulePath), '-p', join(work, 'tsconfig.json')], {
    cwd: work,
    stdio: 'inherit',
  })
}
finally {
  rmSync(work, { recursive: true, force: true })
}

console.log('[generated-templates-strict] REST bridge emits parseable ESM and passes strict JSDoc checking.')
