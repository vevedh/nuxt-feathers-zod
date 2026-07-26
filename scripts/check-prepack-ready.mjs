import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const failures = []
for (const file of ['dist/module.mjs', 'dist/cli/index.mjs']) {
  if (!existsSync(resolve(root, file)))
    failures.push(`missing ${file}`)
}
const starter = JSON.parse(readFileSync(resolve(root, 'examples/nfz-quasar-unocss-pinia-starter/package.json'), 'utf8'))
if (starter.dependencies?.['nuxt-feathers-zod'] !== pkg.version)
  failures.push('starter dependency version is not aligned with package.json')

if (failures.length) {
  console.error('[release] Lightweight prepack readiness failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('[release] Use "bun run release:prepare:publish" instead of packing an unverified folder.')
  process.exit(1)
}
console.log(`[release] Lightweight prepack readiness passed for ${pkg.name}@${pkg.version}.`)
