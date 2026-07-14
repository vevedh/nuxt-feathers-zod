import { spawnSync } from 'node:child_process'

const npmCommand = String(process.env.npm_command || '').trim().toLowerCase()

if (npmCommand === 'pack' || npmCommand === 'publish') {
  console.log(`[nuxt-feathers-zod] prepare skipped during npm ${npmCommand}; prepack already validated and built the package.`)
  process.exit(0)
}

const result = spawnSync(process.execPath, ['run', 'prepare:project'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})

if (result.error)
  throw result.error

process.exit(result.status ?? 1)
