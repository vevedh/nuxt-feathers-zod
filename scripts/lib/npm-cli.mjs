import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export function resolveNpmCliPath({ execPath = process.execPath, env = process.env } = {}) {
  const candidates = []
  const npmExecPath = String(env.npm_execpath || '').trim()

  if (/npm-cli\.js$/i.test(npmExecPath))
    candidates.push(npmExecPath)

  const executableDirectory = dirname(execPath)
  candidates.push(
    resolve(executableDirectory, 'node_modules/npm/bin/npm-cli.js'),
    resolve(executableDirectory, '../lib/node_modules/npm/bin/npm-cli.js'),
    resolve(executableDirectory, '../node_modules/npm/bin/npm-cli.js'),
  )

  return candidates.find(candidate => existsSync(candidate))
}
