import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const config = readFileSync(resolve(root, 'eslint.config.mjs'), 'utf8')
const criticalFiles = [
  'src/runtime/server/bootstrap.ts',
  'src/runtime/server/types.ts',
  'src/runtime/server/database-registry.ts',
  'src/runtime/server/database-registry.test.ts',
]
const failures = criticalFiles.filter(file => config.includes(`'${file}'`) || config.includes(`"${file}"`))

if (failures.length) {
  console.error('[nuxt-feathers-zod] Critical ESLint coverage check failed:')
  for (const file of failures)
    console.error(`- ${file} is explicitly ignored by eslint.config.mjs`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Security-critical runtime files remain covered by ESLint.')
