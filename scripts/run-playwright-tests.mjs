import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensurePlaywrightRuntime } from './lib/ensure-playwright-runtime.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

const require = createRequire(import.meta.url)
const packageJsonPath = require.resolve('@playwright/test/package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const playwrightBin = typeof packageJson.bin === 'string'
  ? packageJson.bin
  : packageJson.bin?.playwright

if (typeof playwrightBin !== 'string' || !playwrightBin.trim())
  throw new Error('[nuxt-feathers-zod] @playwright/test does not expose a Playwright CLI entrypoint.')

const playwrightCli = resolve(dirname(packageJsonPath), playwrightBin)
const rawArgs = process.argv.slice(2)
const updateScreenshots = rawArgs.includes('--update-doc-screenshots')
const installBrowser = rawArgs.includes('--install-browser')
const withDependencies = rawArgs.includes('--with-deps')
const internalArguments = new Set(['--update-doc-screenshots', '--install-browser', '--with-deps'])
const forwarded = rawArgs.filter(arg => !internalArguments.has(arg))

if (!installBrowser)
  ensurePlaywrightRuntime(rootDir)

const args = installBrowser
  ? [
      playwrightCli,
      'install',
      ...(withDependencies ? ['--with-deps'] : []),
      'chromium',
      ...forwarded,
    ]
  : [playwrightCli, 'test', ...forwarded]

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...(updateScreenshots ? { NFZ_UPDATE_DOC_SCREENSHOTS: '1' } : {}),
  },
})

child.on('error', (error) => {
  console.error(`[nuxt-feathers-zod] Unable to start Playwright: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
