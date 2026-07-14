import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const files = [
  'src/runtime/templates/server/plugin.ts',
  'src/runtime/templates/server/mongodb.ts',
]
const forbidden = [
  /JSON\.stringify\(mongoUrl\)/,
  /secret:\s*keycloak\.secret/,
  /url:\s*options\.database\.mongo\.url/,
  /const mongodbConnection = \$\{JSON\.stringify/,
]
const problems = []

for (const file of files) {
  const content = readFileSync(resolve(rootDir, file), 'utf8')
  for (const pattern of forbidden) {
    if (pattern.test(content))
      problems.push(`${file}: matches ${pattern}`)
  }
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Generated template secret-safety check failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Server templates resolve private MongoDB and Keycloak values at runtime.')
