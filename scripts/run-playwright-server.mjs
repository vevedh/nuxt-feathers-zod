import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { ensurePlaywrightRuntime } from './lib/ensure-playwright-runtime.mjs'

const runnerPath = fileURLToPath(new URL('./run-playground.mjs', import.meta.url))
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const port = String(process.env.NFZ_PLAYWRIGHT_PORT || '3300')

ensurePlaywrightRuntime(rootDir)

process.env.NFZ_PLAYGROUND_EMBEDDED_MONGODB = 'false'
process.env.NFZ_AUTH_SECRET ||= randomBytes(48).toString('base64url')
process.env.NUXT_TELEMETRY_DISABLED = '1'
process.argv = [process.execPath, runnerPath, 'dev', '--host', '127.0.0.1', '--port', port]

await import('./run-playground.mjs')
