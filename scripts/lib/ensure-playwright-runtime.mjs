import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'

function resolveBunExecutable(env = process.env) {
  const npmExecPath = String(env.npm_execpath || '').trim()
  if (npmExecPath && /^bun(?:\.exe)?$/i.test(basename(npmExecPath)))
    return npmExecPath
  return process.platform === 'win32' ? 'bun.exe' : 'bun'
}

function runBunScript(script, rootDir) {
  const command = resolveBunExecutable()
  const result = spawnSync(command, ['run', script], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    throw new Error(
      `[nuxt-feathers-zod] Unable to prepare the module runtime with '${command} run ${script}': ${result.error.message}`,
    )
  }
  if (result.status !== 0) {
    throw new Error(
      `[nuxt-feathers-zod] Module runtime preparation failed during '${command} run ${script}' (exit ${result.status}).`,
    )
  }
}

export function ensurePlaywrightRuntime(rootDir = resolve(process.cwd())) {
  const requiredFiles = [
    resolve(rootDir, 'dist/module.mjs'),
    resolve(rootDir, 'dist/runtime/server/instance-registry.js'),
    resolve(rootDir, 'dist/runtime/server/console-services.js'),
  ]

  if (requiredFiles.every(existsSync))
    return

  console.info('[nuxt-feathers-zod] Module runtime is missing; building the module before starting the playground.')
  runBunScript('module:prepare', rootDir)
  runBunScript('module:build', rootDir)

  const missing = requiredFiles.filter(path => !existsSync(path))
  if (missing.length) {
    throw new Error(
      `[nuxt-feathers-zod] Module runtime build completed without required files: ${missing.join(', ')}`,
    )
  }
}
