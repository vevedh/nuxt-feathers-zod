import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const executable = resolve(rootDir, 'bin/nfz')
const runs = Math.max(3, Number(process.env.NFZ_CLI_BENCH_RUNS || 5))
const budgetMs = Number(process.env.NFZ_CLI_STARTUP_BUDGET_MS || 1_200)
const durations = []

for (let index = 0; index < runs; index++) {
  const started = performance.now()
  const result = spawnSync(process.execPath, [executable, '--help'], {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const elapsed = performance.now() - started

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || '[nuxt-feathers-zod] CLI benchmark failed.')
    process.exit(result.status || 1)
  }
  durations.push(elapsed)
}

durations.sort((a, b) => a - b)
const median = durations[Math.floor(durations.length / 2)]
const formatted = durations.map(value => value.toFixed(1)).join(', ')

if (median > budgetMs) {
  console.error(`[nuxt-feathers-zod] CLI startup budget exceeded: median=${median.toFixed(1)} ms budget=${budgetMs} ms runs=[${formatted}]`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] CLI startup OK: median=${median.toFixed(1)} ms budget=${budgetMs} ms runs=[${formatted}]`)
