import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')
const pkg = JSON.parse(read('package.json'))
const cliTest = read('test/cli.spec.ts')
const publicCommandsTest = read('test/public-doc-commands.spec.ts')
const bin = read('bin/nuxt-feathers-zod')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function forbidText(source, forbidden, label) {
  if (source.includes(forbidden))
    problems.push(`${label}: forbidden ${JSON.stringify(forbidden)}`)
}

requireText(
  cliTest,
  `expect(code).toContain('"allowMissingDatabaseServices": false')`,
  'generated server config assertion',
)
forbidText(
  cliTest,
  `expect(code).toContain('allowMissingDatabaseServices: false')`,
  'stale unquoted generated server config assertion',
)

requireText(
  cliTest,
  'AttachmentService: new (app: { get(key: string): unknown }) => {',
  'singular generated file service class contract',
)
requireText(
  cliTest,
  'new module.AttachmentService({ get: key => settings.get(key) })',
  'generated file service constructor test',
)
forbidText(
  cliTest,
  'new module.AttachmentsService(',
  'plural file service class mismatch',
)

requireText(
  cliTest,
  "settings.set('attachmentsMaxBytes', 2)",
  'runtime file-service maxBytes mutation coverage',
)
requireText(
  cliTest,
  "rejects.toThrow('encoded payload exceeds configured maxBytes')",
  'runtime file-service encoded size rejection',
)

const integrationScript = String(pkg.scripts?.['test:integration'] || '')
if (!integrationScript.startsWith('bun run cli:build && ')) {
  problems.push(
    'test:integration must rebuild dist/cli before tests that execute bin/nuxt-feathers-zod',
  )
}

requireText(
  publicCommandsTest,
  "expect(pkg.scripts.prepack).toBe('node scripts/check-prepack-ready.mjs')",
  'lightweight prepack integration contract',
)
forbidText(
  publicCommandsTest,
  "expect(pkg.scripts.prepack).toContain('bun run docs:check-commands')",
  'retired heavy prepack documentation assertion',
)
requireText(
  publicCommandsTest,
  "expect(pkg.scripts['release:finalize']).toBe('node scripts/finalize-release.mjs')",
  'final release operation integration contract',
)

requireText(
  publicCommandsTest,
  "resolve(root, 'bin/nuxt-feathers-zod')",
  'public command packaged bin execution',
)
requireText(
  bin,
  "import('../dist/cli/index.mjs')",
  'packaged bin compiled CLI dependency',
)

if (problems.length) {
  console.error('[nuxt-feathers-zod] Integration gate regression guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Integration gate regressions are covered.')
