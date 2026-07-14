import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const lock = readFileSync(resolve(rootDir, 'bun.lock'), 'utf8')
const problems = []

const expected = {
  '@feathersjs/adapter-commons': '5.0.46',
  '@feathersjs/authentication': '5.0.46',
  '@feathersjs/authentication-client': '5.0.46',
  '@feathersjs/authentication-local': '5.0.46',
  '@feathersjs/authentication-oauth': '5.0.46',
  '@feathersjs/commons': '5.0.46',
  '@feathersjs/configuration': '5.0.46',
  '@feathersjs/errors': '5.0.46',
  '@feathersjs/express': '5.0.46',
  '@feathersjs/feathers': '5.0.46',
  '@feathersjs/generators': '5.0.46',
  '@feathersjs/koa': '5.0.46',
  '@feathersjs/memory': '5.0.46',
  '@feathersjs/mongodb': '5.0.46',
  '@feathersjs/rest-client': '5.0.46',
  '@feathersjs/schema': '5.0.46',
  '@feathersjs/socketio': '5.0.46',
  '@feathersjs/socketio-client': '5.0.46',
  h3: '1.15.11',
  nitropack: '2.13.4',
  '@nuxt/kit': '4.4.2',
}

for (const [name, version] of Object.entries(expected)) {
  const actual = pkg.dependencies?.[name]
  if (actual !== version)
    problems.push(`${name}: expected ${version}, found ${actual ?? 'missing'}`)
  if (!lock.includes(`"${name}@${version}"`))
    problems.push(`${name}: ${version} is missing from bun.lock`)
}

for (const [name, version] of Object.entries({ '@nuxt/schema': '4.4.2', nuxt: '4.4.2' })) {
  const actual = pkg.devDependencies?.[name]
  if (actual !== version)
    problems.push(`${name}: expected ${version}, found ${actual ?? 'missing'}`)
  if (!lock.includes(`"${name}@${version}"`))
    problems.push(`${name}: ${version} is missing from bun.lock`)
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Dependency convergence check failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Feathers, Nitro, H3 and Nuxt dependency versions are converged.')
