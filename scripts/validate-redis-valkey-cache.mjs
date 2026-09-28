import { spawnSync } from 'node:child_process'

const redisUrl = process.env.NFZ_TEST_REDIS_URL
const valkeyUrl = process.env.NFZ_TEST_VALKEY_URL
if (!redisUrl || !valkeyUrl) {
  console.error('[Patch075 r2] Set NFZ_TEST_REDIS_URL and NFZ_TEST_VALKEY_URL before running real-engine cache certification.')
  process.exit(1)
}
const result = spawnSync(process.platform === 'win32' ? 'bun.exe' : 'bun', [
  'x', 'vitest', 'run', '-c', 'vitest.integration.config.mts', 'test/cache-redis-valkey.spec.ts', '--no-file-parallelism', '--maxWorkers=1',
], { stdio: 'inherit', env: process.env })
process.exit(result.status ?? 1)
