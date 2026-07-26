import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  isRetryableInstallFailure,
  isWindowsFileLockFailure,
  parsePositiveInteger,
  resolveAttemptCount,
  resolveNetworkConcurrency,
  resolveRetryDelayMs,
} from './windows-install-policy.mjs'

function appendCapturedOutput(current, chunk) {
  const text = String(chunk || '')
  return `${current}${text}`.slice(-4 * 1024 * 1024)
}

function removeTree(path, label, { required = true } = {}) {
  if (!existsSync(path))
    return true

  try {
    rmSync(path, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 300,
    })
    return true
  }
  catch (error) {
    if (!required) {
      console.warn(`[starter-release] Could not clean ${label}: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }

    throw new Error(
      `[starter-release] Unable to clean ${label} at ${path}. Close Nuxt, Vite, Node and Bun processes, then retry.`,
      { cause: error },
    )
  }
}

function removeTransientCacheEntries(cacheDir) {
  if (!existsSync(cacheDir))
    return

  for (const entry of readdirSync(cacheDir, { withFileTypes: true })) {
    if (!entry.name.startsWith('.'))
      continue
    removeTree(resolve(cacheDir, entry.name), `the transient Bun cache entry ${entry.name}`, { required: false })
  }
}

function formatInvocation(command, prefix, args) {
  return [command, ...prefix, ...args]
    .map(value => /\s/.test(value) ? JSON.stringify(value) : value)
    .join(' ')
}

function runStreaming(command, prefix, args, { cwd, env, timeoutMs }) {
  return new Promise((resolveResult) => {
    const child = spawn(command, [...prefix, ...args], {
      cwd,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    let timer

    const settle = result => {
      if (settled)
        return
      settled = true
      if (timer)
        clearTimeout(timer)
      resolveResult(result)
    }

    child.stdout?.on('data', (chunk) => {
      stdout = appendCapturedOutput(stdout, chunk)
      process.stdout.write(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      stderr = appendCapturedOutput(stderr, chunk)
      process.stderr.write(chunk)
    })
    child.on('error', error => settle({ status: null, error, stdout, stderr, timedOut: false }))
    child.on('close', status => settle({ status, error: undefined, stdout, stderr, timedOut: false }))

    timer = setTimeout(() => {
      try {
        child.kill('SIGKILL')
      }
      catch {}
      settle({
        status: null,
        error: new Error(`Bun starter dependency installation exceeded ${timeoutMs} ms.`),
        stdout,
        stderr,
        timedOut: true,
      })
    }, timeoutMs)
    timer.unref?.()
  })
}

function verifyStarterInstall(starterDir, expectedNfzVersion) {
  const packages = [
    ['nuxt', undefined],
    ['nuxt-feathers-zod', expectedNfzVersion],
    ['vue-tsc', undefined],
  ]

  for (const [name, expectedVersion] of packages) {
    const packagePath = resolve(starterDir, 'node_modules', ...name.split('/'), 'package.json')
    if (!existsSync(packagePath))
      return { ok: false, reason: `Missing ${packagePath}` }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
      if (packageJson.name !== name)
        return { ok: false, reason: `Unexpected package name in ${packagePath}` }
      if (expectedVersion && packageJson.version !== expectedVersion) {
        return {
          ok: false,
          reason: `Installed ${name} version ${packageJson.version || 'unknown'} does not match ${expectedVersion}.`,
        }
      }
    }
    catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) }
    }
  }

  return { ok: true }
}

function resolveCacheDirectory({ starterDir, configuredCache }) {
  const configured = String(configuredCache || '').trim()
  if (configured)
    return isAbsolute(configured) ? configured : resolve(starterDir, configured)

  if (process.platform === 'win32' && process.env.LOCALAPPDATA)
    return resolve(process.env.LOCALAPPDATA, 'nuxt-feathers-zod', 'bun-starter-release-cache')

  return resolve(starterDir, '.bun-cache', 'starter-release-shared')
}

function createInstallArgs({ cacheDir, networkConcurrency, frozen, isolated }) {
  return [
    'install',
    ...(frozen ? ['--frozen-lockfile'] : []),
    '--backend=copyfile',
    '--linker=hoisted',
    '--concurrent-scripts=1',
    '--ignore-scripts',
    `--network-concurrency=${networkConcurrency}`,
    '--cache-dir', cacheDir,
    ...(isolated ? ['--no-cache'] : []),
    '--no-progress',
  ]
}

async function runInstallPhase({
  bun,
  bunArgsPrefix,
  starterDir,
  workDir,
  env,
  cacheDir,
  expectedNfzVersion,
  attempts,
  initialNetworkConcurrency,
  retryDelayMs,
  timeoutMs,
  frozen,
}) {
  const phase = frozen ? 'frozen lockfile verification' : 'dependency resolution'
  const lockPath = resolve(starterDir, 'bun.lock')
  const lockExistedBeforePhase = existsSync(lockPath)
  let lastOutput = ''
  let lastFailure

  mkdirSync(cacheDir, { recursive: true })
  removeTransientCacheEntries(cacheDir)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const networkConcurrency = resolveNetworkConcurrency(attempt, initialNetworkConcurrency)
    const args = createInstallArgs({ cacheDir, networkConcurrency, frozen, isolated: false })
    console.log(`[starter-release] ${phase} attempt ${attempt}/${attempts} (shared cache, network concurrency=${networkConcurrency})`)
    console.log(`[starter-release] ${formatInvocation(bun, bunArgsPrefix, args)}`)
    const result = await runStreaming(bun, bunArgsPrefix, args, {
      cwd: starterDir,
      env: { ...env, BUN_INSTALL_CACHE_DIR: cacheDir },
      timeoutMs,
    })
    const verification = !result.error && result.status === 0
      ? verifyStarterInstall(starterDir, expectedNfzVersion)
      : undefined

    lastOutput = [
      result.stdout || '',
      result.stderr || '',
      verification && !verification.ok ? verification.reason : '',
    ].filter(Boolean).join('\n')

    if (!result.error && result.status === 0 && verification?.ok) {
      console.log(`[starter-release] ${phase} completed with the reusable cache.`)
      return { mode: 'shared-cache', attempts: attempt }
    }

    lastFailure = result.error || new Error(
      result.status === 0
        ? `Starter dependency verification failed: ${verification?.reason || 'unknown verification failure'}`
        : `Bun starter install exited with status ${result.status ?? 'unknown'}.`,
    )

    const retryable = result.status === 0 && verification && !verification.ok
      ? true
      : isRetryableInstallFailure(lastOutput)
    if (!retryable || attempt >= attempts)
      break

    const waitMs = retryDelayMs ?? resolveRetryDelayMs(attempt, lastOutput)
    console.warn(
      isWindowsFileLockFailure(lastOutput)
        ? `[starter-release] Windows temporarily locked starter cache entries. Retrying after ${waitMs} ms.`
        : `[starter-release] Transient starter installation failure detected. Retrying after ${waitMs} ms.`,
    )
    removeTree(resolve(starterDir, 'node_modules'), 'the incomplete starter node_modules directory')
    if (!frozen && !lockExistedBeforePhase)
      removeTree(lockPath, 'the incomplete generated starter lockfile', { required: false })
    removeTransientCacheEntries(cacheDir)
    await delay(waitMs)
  }

  if (!isRetryableInstallFailure(lastOutput))
    throw new Error(`[starter-release] Unable to complete ${phase}.`, { cause: lastFailure })

  const rescueCache = resolve(workDir || tmpdir(), '.bun-cache', frozen ? 'starter-frozen-rescue' : 'starter-install-rescue')
  removeTree(rescueCache, 'the isolated starter rescue cache', { required: false })
  mkdirSync(rescueCache, { recursive: true })
  removeTree(resolve(starterDir, 'node_modules'), 'the incomplete starter node_modules directory')
  if (!frozen && !lockExistedBeforePhase)
    removeTree(lockPath, 'the incomplete generated starter lockfile', { required: false })

  const rescueArgs = createInstallArgs({
    cacheDir: rescueCache,
    networkConcurrency: 1,
    frozen,
    isolated: true,
  })
  console.warn(`[starter-release] Shared-cache attempts exhausted for ${phase}. Running one isolated no-cache rescue.`)
  console.log(`[starter-release] ${formatInvocation(bun, bunArgsPrefix, rescueArgs)}`)
  const rescue = await runStreaming(bun, bunArgsPrefix, rescueArgs, {
    cwd: starterDir,
    env: { ...env, BUN_INSTALL_CACHE_DIR: rescueCache },
    timeoutMs,
  })
  const verification = !rescue.error && rescue.status === 0
    ? verifyStarterInstall(starterDir, expectedNfzVersion)
    : undefined

  if (!rescue.error && rescue.status === 0 && verification?.ok) {
    console.log(`[starter-release] ${phase} completed through the isolated rescue cache.`)
    removeTree(rescueCache, 'the isolated starter rescue cache', { required: false })
    return { mode: 'isolated-rescue', attempts: attempts + 1 }
  }

  const rescueFailure = rescue.error || new Error(
    rescue.status === 0
      ? `Starter dependency verification failed: ${verification?.reason || 'unknown verification failure'}`
      : `Bun isolated starter install exited with status ${rescue.status ?? 'unknown'}.`,
  )
  throw new Error(`[starter-release] Unable to complete ${phase} after isolated rescue.`, { cause: rescueFailure })
}

export async function installStarterReleaseDependencies({
  bun,
  bunArgsPrefix = [],
  starterDir,
  workDir,
  env = process.env,
  expectedNfzVersion,
  configuredCache = process.env.NFZ_STARTER_RELEASE_CACHE_DIR,
  attempts = resolveAttemptCount(process.env.NFZ_STARTER_INSTALL_ATTEMPTS),
  initialNetworkConcurrency = parsePositiveInteger(process.env.NFZ_STARTER_NETWORK_CONCURRENCY, 8),
  retryDelayMs,
  timeoutMs = parsePositiveInteger(process.env.NFZ_STARTER_INSTALL_TIMEOUT_MS, 15 * 60 * 1000),
} = {}) {
  if (!bun)
    throw new Error('[starter-release] A Bun executable is required.')
  if (!starterDir)
    throw new Error('[starter-release] The starter directory is required.')
  if (!expectedNfzVersion)
    throw new Error('[starter-release] The expected nuxt-feathers-zod version is required.')

  const cacheDir = resolveCacheDirectory({ starterDir, configuredCache })
  console.log(`[starter-release] Reusable Bun cache: ${cacheDir}`)
  console.log('[starter-release] Dependency lifecycle scripts are disabled during installation; starter preparation runs explicitly afterward.')

  const initial = await runInstallPhase({
    bun,
    bunArgsPrefix,
    starterDir,
    workDir,
    env,
    cacheDir,
    expectedNfzVersion,
    attempts,
    initialNetworkConcurrency,
    retryDelayMs,
    timeoutMs,
    frozen: false,
  })

  if (!existsSync(resolve(starterDir, 'bun.lock')))
    throw new Error('[starter-release] Bun did not generate the starter bun.lock file.')

  const frozen = await runInstallPhase({
    bun,
    bunArgsPrefix,
    starterDir,
    workDir,
    env,
    cacheDir,
    expectedNfzVersion,
    attempts,
    initialNetworkConcurrency,
    retryDelayMs,
    timeoutMs,
    frozen: true,
  })

  return { cacheDir, initial, frozen }
}
