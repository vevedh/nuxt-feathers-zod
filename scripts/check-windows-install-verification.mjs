import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import {
  formatWindowsInstallVerificationFailure,
  verifyWindowsInstall,
} from './lib/windows-install-verification.mjs'

const root = mkdtempSync(resolve(tmpdir(), 'nfz-install-verification-'))
const failures = []

function expect(condition, message) {
  if (!condition)
    failures.push(message)
}

function writePackage(name, source) {
  const packageRoot = resolve(root, 'node_modules', ...name.split('/'))
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(resolve(packageRoot, 'package.json'), `${JSON.stringify({
    name,
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
  }, null, 2)}\n`)
  writeFileSync(resolve(packageRoot, 'index.js'), source)
}

try {
  writePackage('exports-only', 'export const ready = true\n')
  const valid = verifyWindowsInstall({ root, probes: ['exports-only'] })
  expect(valid.ok, `a package exposing only its public entry point must verify: ${formatWindowsInstallVerificationFailure(valid)}`)

  writePackage('broken-runtime', "import 'missing-transitive-dependency'\nexport const ready = false\n")
  const broken = verifyWindowsInstall({ root, probes: ['broken-runtime'] })
  expect(!broken.ok, 'a package with a missing transitive runtime dependency must fail verification')
  expect(
    formatWindowsInstallVerificationFailure(broken).includes('missing-transitive-dependency'),
    'verification diagnostics must identify the missing transitive dependency',
  )
}
finally {
  rmSync(root, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error('[nuxt-feathers-zod] Windows install verification guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Windows install verification guard passed.')
