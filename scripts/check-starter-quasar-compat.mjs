import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const starterPath = resolve(root, 'examples/nfz-quasar-unocss-pinia-starter/package.json')
const starter = JSON.parse(readFileSync(starterPath, 'utf8'))
const problems = []

const expected = {
  'nuxt-quasar-ui': '3.1.1',
  quasar: '2.31.0',
}

for (const [name, version] of Object.entries(expected)) {
  const actual = starter.dependencies?.[name]
  if (actual !== version)
    problems.push(`${name}: expected exact starter baseline ${version}, found ${actual ?? 'missing'}`)
}

const nuxtVersion = starter.dependencies?.nuxt
if (nuxtVersion !== '4.5.2')
  problems.push(`nuxt: expected exact certified baseline 4.5.2, found ${nuxtVersion ?? 'missing'}`)

const vueVersion = starter.dependencies?.vue
if (vueVersion !== '3.5.42')
  problems.push(`vue: expected exact certified baseline 3.5.42, found ${vueVersion ?? 'missing'}`)

if (problems.length > 0) {
  console.error('[nuxt-feathers-zod] Starter Quasar compatibility check failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Starter Quasar baseline is Nuxt 4.5.2 + Vue 3.5.42 + nuxt-quasar-ui 3.1.1 + Quasar 2.31.0 compatible.')
