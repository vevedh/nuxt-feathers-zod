import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'

function isBunBinary(value) {
  return /^bun(?:\.exe)?$/i.test(basename(String(value || '').trim()))
}

function canRun(command) {
  if (!command)
    return false

  const result = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: false,
  })
  return !result.error && result.status === 0
}

export function resolveBunExecutable(env = process.env) {
  const candidates = []
  const explicit = String(env.NFZ_BUN_EXECUTABLE || '').trim()
  const npmExecPath = String(env.npm_execpath || '').trim()
  const bunInstall = String(env.BUN_INSTALL || '').trim()

  if (explicit)
    candidates.push(explicit)
  if (npmExecPath && isBunBinary(npmExecPath))
    candidates.push(npmExecPath)
  if (bunInstall) {
    candidates.push(
      join(bunInstall, 'bin', process.platform === 'win32' ? 'bun.exe' : 'bun'),
      join(bunInstall, process.platform === 'win32' ? 'bun.exe' : 'bun'),
    )
  }

  candidates.push(process.platform === 'win32' ? 'bun.exe' : 'bun', 'bun')

  for (const candidate of [...new Set(candidates)]) {
    if ((candidate.includes('/') || candidate.includes('\\')) && !existsSync(candidate))
      continue
    if (canRun(candidate))
      return candidate
  }

  return undefined
}

export function requireBunExecutable(env = process.env) {
  const executable = resolveBunExecutable(env)
  if (!executable) {
    throw new Error(
      'Bun is required but no executable could be resolved. Run the command through `bun run`, '
      + 'set NFZ_BUN_EXECUTABLE to the absolute bun executable path, or add Bun to PATH.',
    )
  }
  return executable
}
