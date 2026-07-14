import { readFileSync } from 'node:fs'

const content = readFileSync(new URL('../src/cli/core.ts', import.meta.url), 'utf8')
const checks = [
  {
    name: 'escaped-regex-healthcheck',
    ok: !content.includes("replace(/\/$/, '') + '/health'"),
    message: 'Fragile regex-based healthcheck path template still present in src/cli/core.ts',
  },
  {
    name: 'nested-template-healthcheck',
    ok: !content.includes('${' + 'basePath}health') && !content.includes('${' + 'basePath}/health'),
    message: 'Nested template literal interpolation still present in generated healthcheck module template',
  },
]

const failed = checks.filter(check => !check.ok)
if (failed.length) {
  console.error('[nfz] template safety check failed')
  for (const failure of failed)
    console.error(`- ${failure.name}: ${failure.message}`)
  process.exit(1)
}

console.log('[nfz] template safety check passed')
