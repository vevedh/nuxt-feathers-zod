import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { requireBunExecutable } from './lib/bun-executable.mjs'
import {
  isRetryableInstallFailure,
  isWindowsFileLockFailure,
  parsePositiveInteger,
  resolveAttemptCount,
  resolveNetworkConcurrency,
  resolveRetryDelayMs,
} from './lib/windows-install-policy.mjs'

const root = resolve(import.meta.dirname, '..')

function parseRunnerArguments(argv) {
  const [requested, ...options] = argv
  let bunExecutable
  let bunExecutableArgsJson
  let bunVersion
  let retryDelayMs

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]
    if (option === '--bun-executable') {
      if (options[index + 1] === undefined)
        throw new Error('--bun-executable requires a value.')
      bunExecutable = options[index + 1]
      index += 1
      continue
    }
    if (option === '--bun-version') {
      if (options[index + 1] === undefined)
        throw new Error('--bun-version requires a value.')
      bunVersion = options[index + 1]
      index += 1
      continue
    }
    if (option === '--retry-delay-ms') {
      if (options[index + 1] === undefined)
        throw new Error('--retry-delay-ms requires a value.')
      const parsed = Number.parseInt(options[index + 1], 10)
      if (!Number.isInteger(parsed) || parsed <= 0)
        throw new Error('--retry-delay-ms must be a positive integer.')
      retryDelayMs = parsed
      index += 1
      continue
    }
    if (option === '--bun-executable-args-json') {
      if (options[index + 1] === undefined)
        throw new Error('--bun-executable-args-json requires a value.')
      bunExecutableArgsJson = options[index + 1]
      index += 1
      continue
    }
    throw new Error(`Unknown documentation build option: ${option}`)
  }

  if (!['docs', 'docs-private'].includes(requested)) {
    throw new Error(
      'Usage: node scripts/run-docs-build.mjs <docs|docs-private> '
      + '[--bun-executable <path>] [--bun-executable-args-json <json-array>] '
      + '[--bun-version <semver>] [--retry-delay-ms <positive-integer>]',
    )
  }

  if (bunExecutable !== undefined && !String(bunExecutable).trim())
    throw new Error('--bun-executable requires a non-empty value.')
  if (bunVersion !== undefined && !/^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?$/i.test(String(bunVersion).trim()))
    throw new Error('--bun-version must be a semantic version.')

  return { requested, bunExecutable, bunExecutableArgsJson, bunVersion, retryDelayMs }
}

function parseExecutablePrefix(value, sourceLabel = 'NFZ_BUN_EXECUTABLE_ARGS') {
  const source = String(value || '').trim()
  if (!source)
    return []

  let parsed
  try {
    parsed = JSON.parse(source)
  }
  catch (error) {
    throw new Error(`${sourceLabel} must be a JSON array of strings.`, { cause: error })
  }

  if (!Array.isArray(parsed) || parsed.some(argument => typeof argument !== 'string'))
    throw new TypeError(`${sourceLabel} must be a JSON array of strings.`)

  return parsed
}

const runnerArguments = parseRunnerArguments(process.argv.slice(2))
const requested = runnerArguments.requested
const bun = runnerArguments.bunExecutable || requireBunExecutable()
const bunExecutableArgs = runnerArguments.bunExecutableArgsJson !== undefined
  ? parseExecutablePrefix(runnerArguments.bunExecutableArgsJson, '--bun-executable-args-json')
  : parseExecutablePrefix(process.env.NFZ_BUN_EXECUTABLE_ARGS)
const suppliedBunVersion = runnerArguments.bunVersion?.trim()
const suppliedRetryDelayMs = runnerArguments.retryDelayMs
const bunInvocation = args => [...bunExecutableArgs, ...args]
const formatBunInvocation = args => [bun, ...bunInvocation(args)].join(' ')
const workspace = resolve(root, requested)
const nodeModules = resolve(workspace, 'node_modules')
const attempts = resolveAttemptCount(process.env.NFZ_DOCS_INSTALL_ATTEMPTS)
const initialNetworkConcurrency = parsePositiveInteger(process.env.NFZ_DOCS_NETWORK_CONCURRENCY, 8)
const configuredCache = String(process.env.NFZ_DOCS_CACHE_DIR || '').trim()
const defaultSharedCache = process.platform === 'win32' && process.env.LOCALAPPDATA
  ? resolve(process.env.LOCALAPPDATA, 'nuxt-feathers-zod', 'bun-docs-cache')
  : resolve(root, '.bun-cache', 'docs-shared-cache')
const cacheDir = configuredCache
  ? (isAbsolute(configuredCache) ? configuredCache : resolve(root, configuredCache))
  : defaultSharedCache
const stateRoot = resolve(root, '.bun-cache', 'docs-install-state')
const stateFile = resolve(stateRoot, `${requested}.json`)
const probeTimeoutMs = parsePositiveInteger(process.env.NFZ_DOCS_PROBE_TIMEOUT_MS, 20_000)
const buildTimeoutMs = parsePositiveInteger(process.env.NFZ_DOCS_BUILD_TIMEOUT_MS, 15 * 60 * 1000)
const heartbeatMs = parsePositiveInteger(process.env.NFZ_DOCS_HEARTBEAT_MS, 30_000)
const terminationGraceMs = parsePositiveInteger(process.env.NFZ_DOCS_TERMINATION_GRACE_MS, 1_500)

function removeTree(path, label, { required = true } = {}) {
  if (!existsSync(path))
    return true

  try {
    rmSync(path, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 400,
    })
    return true
  }
  catch (error) {
    if (!required) {
      console.warn(`[docs-build] Could not clean ${label}: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }

    throw new Error(
      `[docs-build] Unable to clean ${label} at ${path}. Close VitePress, Nuxt, Node and Bun processes, then retry.`,
      { cause: error },
    )
  }
}

function removeTransientCacheEntries(targetCache) {
  if (!existsSync(targetCache))
    return

  for (const entry of readdirSync(targetCache, { withFileTypes: true })) {
    if (!entry.name.startsWith('.'))
      continue
    removeTree(resolve(targetCache, entry.name), `the transient Bun cache entry ${entry.name}`, { required: false })
  }
}

function appendCapturedOutput(current, chunk) {
  const limit = 4 * 1024 * 1024
  const combined = `${current}${chunk}`
  return combined.length > limit ? combined.slice(-limit) : combined
}

function terminateProcessTree(child) {
  if (!child.pid)
    return

  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
    })
    const fallback = setTimeout(() => {
      killer.kill()
      child.kill()
    }, Math.min(terminationGraceMs, 1_000))
    fallback.unref()
    killer.once('error', () => child.kill())
    killer.once('close', () => {
      clearTimeout(fallback)
      child.kill()
    })
    killer.unref()
    return
  }

  child.kill('SIGTERM')
  const forceKill = setTimeout(() => child.kill('SIGKILL'), terminationGraceMs)
  forceKill.unref()
}

function runStreaming(command, args, {
  cwd = workspace,
  cache = cacheDir,
  timeoutMs = 0,
  heartbeatLabel,
} = {}) {
  return new Promise((resolveProcess) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        BUN_INSTALL_CACHE_DIR: cache,
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let spawnError
    let timedOut = false
    let settled = false
    let forcedCompletion
    const startedAt = Date.now()

    const heartbeat = heartbeatLabel && heartbeatMs > 0
      ? setInterval(() => {
          const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
          console.log(`[docs-build] ${heartbeatLabel} is still running (${elapsedSeconds}s elapsed).`)
        }, heartbeatMs)
      : undefined
    heartbeat?.unref()

    const timeout = timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true
          console.error(
            `[docs-build] ${heartbeatLabel || command} exceeded the ${timeoutMs} ms timeout. `
            + 'Terminating the child process tree.',
          )
          terminateProcessTree(child)
          forcedCompletion = setTimeout(() => {
            child.stdout?.destroy()
            child.stderr?.destroy()
            finish(null)
          }, terminationGraceMs)
          forcedCompletion.unref()
        }, timeoutMs)
      : undefined
    timeout?.unref()

    const finish = (status) => {
      if (settled)
        return
      settled = true
      if (heartbeat)
        clearInterval(heartbeat)
      if (timeout)
        clearTimeout(timeout)
      if (forcedCompletion)
        clearTimeout(forcedCompletion)
      resolveProcess({ error: spawnError, status, stdout, stderr, timedOut })
    }

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString()
      stdout = appendCapturedOutput(stdout, text)
      process.stdout.write(text)
    })
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString()
      stderr = appendCapturedOutput(stderr, text)
      process.stderr.write(text)
    })
    child.once('error', (error) => {
      spawnError = error
    })
    child.once('close', finish)
  })
}

function runBunStreaming(args, options = {}) {
  return runStreaming(bun, bunInvocation(args), options)
}

function runProbe(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: workspace,
    encoding: 'utf8',
    shell: false,
    timeout: probeTimeoutMs,
    windowsHide: true,
  })

  if (result.error?.code === 'ETIMEDOUT') {
    return {
      ok: false,
      reason: `${label} exceeded the ${probeTimeoutMs} ms probe timeout.`,
    }
  }

  if (result.error || result.status !== 0) {
    return {
      ok: false,
      reason: result.error?.message
        || String(result.stderr || `${label} exited with ${result.status ?? 'unknown'}.`).trim(),
    }
  }

  return { ok: true, stdout: String(result.stdout || '').trim() }
}

function getBunVersion() {
  if (suppliedBunVersion) {
    console.log(`[docs-build] Using supplied Bun version ${suppliedBunVersion} for deterministic runner verification.`)
    return suppliedBunVersion
  }

  const result = runProbe(bun, bunInvocation(['--version']), 'Bun version lookup')
  if (!result.ok)
    throw new Error(result.reason)
  return result.stdout
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path) : Buffer.from('')
}

function createInstallFingerprint(bunVersion) {
  const hash = createHash('sha256')
  hash.update(readOptional(resolve(workspace, 'package.json')))
  hash.update(readOptional(resolve(workspace, 'bun.lock')))
  hash.update(`\nbun=${bunVersion}\n`)
  hash.update('frozen=true\n')
  hash.update('ignoreScripts=true\n')
  return hash.digest('hex')
}

function readInstallState() {
  if (!existsSync(stateFile))
    return undefined

  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'))
  }
  catch {
    return undefined
  }
}

function writeInstallState({ fingerprint, bunVersion }) {
  mkdirSync(stateRoot, { recursive: true })
  writeFileSync(stateFile, `${JSON.stringify({
    schemaVersion: 1,
    workspace: requested,
    fingerprint,
    bunVersion,
    cacheDir,
    verifiedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8')
}

function resolveLockedVitePressVersion() {
  const lockPath = resolve(workspace, 'bun.lock')
  if (!existsSync(lockPath))
    return { ok: false, reason: `Missing ${lockPath}` }

  const lockSource = readFileSync(lockPath, 'utf8')
  const match = lockSource.match(/^\s*"vitepress"\s*:\s*\[\s*"vitepress@([^"\s]+)"/m)
  if (!match)
    return { ok: false, reason: `Unable to resolve the locked VitePress version from ${lockPath}` }

  return { ok: true, version: match[1] }
}

function verifyVitePressInstall() {
  const packagePath = resolve(nodeModules, 'vitepress', 'package.json')
  if (!existsSync(packagePath))
    return { ok: false, reason: `Missing ${packagePath}` }

  try {
    const locked = resolveLockedVitePressVersion()
    if (!locked.ok)
      return locked

    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    if (packageJson.name !== 'vitepress')
      return { ok: false, reason: `Unexpected package name in ${packagePath}` }

    const installedVersion = String(packageJson.version || '').trim()
    if (!/^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?$/i.test(installedVersion))
      return { ok: false, reason: `Invalid installed VitePress version in ${packagePath}` }
    if (installedVersion !== locked.version) {
      return {
        ok: false,
        reason: `Installed VitePress version ${installedVersion} does not match bun.lock ${locked.version}.`,
      }
    }

    const relativeBin = typeof packageJson.bin === 'string'
      ? packageJson.bin
      : packageJson.bin?.vitepress
    if (!relativeBin)
      return { ok: false, reason: 'The installed vitepress package does not expose a CLI bin.' }

    const cliPath = resolve(nodeModules, 'vitepress', relativeBin)
    if (!existsSync(cliPath))
      return { ok: false, reason: `Missing VitePress CLI at ${cliPath}` }

    return { ok: true, cliPath, version: installedVersion, verification: 'static-lockfile' }
  }
  catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

async function installDocsDependencies() {
  const bunVersion = getBunVersion()
  const fingerprint = createInstallFingerprint(bunVersion)
  if (suppliedRetryDelayMs !== undefined)
    console.log(`[docs-build] Using supplied retry delay ${suppliedRetryDelayMs} ms for deterministic runner verification.`)
  const state = readInstallState()
  console.log(`[docs-build] Checking the existing ${requested} VitePress installation against bun.lock.`)
  const existing = verifyVitePressInstall()

  if (state?.fingerprint === fingerprint && existing.ok) {
    console.log(`[docs-build] Reusing verified ${requested} dependencies.`)
    return existing.cliPath
  }

  mkdirSync(cacheDir, { recursive: true })
  mkdirSync(stateRoot, { recursive: true })
  removeTree(nodeModules, `the incomplete ${requested}/node_modules directory`)
  removeTransientCacheEntries(cacheDir)

  let lastOutput = ''
  let lastFailure

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const networkConcurrency = resolveNetworkConcurrency(attempt, initialNetworkConcurrency)
    const args = [
      'install',
      '--frozen-lockfile',
      '--backend=copyfile',
      '--linker=hoisted',
      '--concurrent-scripts=1',
      '--ignore-scripts',
      `--network-concurrency=${networkConcurrency}`,
      '--cache-dir', cacheDir,
      '--no-progress',
    ]

    console.log(
      `[docs-build] Install attempt ${attempt}/${attempts} for ${requested} `
      + `(shared cache, network concurrency=${networkConcurrency})`,
    )
    console.log(`[docs-build] ${formatBunInvocation(args)}`)
    const result = await runBunStreaming(args)
    const verification = !result.error && result.status === 0
      ? verifyVitePressInstall()
      : undefined

    lastOutput = [
      result.stdout || '',
      result.stderr || '',
      verification && !verification.ok ? verification.reason : '',
    ].filter(Boolean).join('\n')

    if (!result.error && result.status === 0 && verification?.ok) {
      writeInstallState({ fingerprint, bunVersion })
      console.log(`[docs-build] ${requested} dependencies installed and statically verified against bun.lock.`)
      console.log(`[docs-build] Reusable cache: ${cacheDir}`)
      return verification.cliPath
    }

    lastFailure = result.error || new Error(
      result.status === 0
        ? `VitePress verification failed: ${verification?.reason || 'unknown verification failure'}`
        : `Bun install exited with status ${result.status ?? 'unknown'}.`,
    )

    const retryable = result.status === 0 && verification && !verification.ok
      ? true
      : isRetryableInstallFailure(lastOutput)
    if (!retryable || attempt >= attempts)
      break

    const retryDelay = suppliedRetryDelayMs ?? resolveRetryDelayMs(attempt, lastOutput)
    console.warn(
      isWindowsFileLockFailure(lastOutput)
        ? '[docs-build] Windows temporarily locked documentation cache entries. '
          + `Reusing successful downloads and retrying after ${retryDelay} ms.`
        : `[docs-build] Transient documentation install failure detected. Retrying after ${retryDelay} ms.`,
    )
    removeTree(nodeModules, `the incomplete ${requested}/node_modules directory`)
    removeTransientCacheEntries(cacheDir)
    await delay(retryDelay)
  }

  if (isWindowsFileLockFailure(lastOutput)) {
    const rescueCache = resolve(
      tmpdir(),
      `nfz-docs-rescue-${createHash('sha256').update(workspace).digest('hex').slice(0, 12)}`,
    )
    removeTree(rescueCache, 'the isolated documentation rescue cache', { required: false })
    mkdirSync(rescueCache, { recursive: true })
    removeTree(nodeModules, `the incomplete ${requested}/node_modules directory`)

    const rescueArgs = [
      'install',
      '--frozen-lockfile',
      '--backend=copyfile',
      '--linker=hoisted',
      '--concurrent-scripts=1',
      '--ignore-scripts',
      '--network-concurrency=1',
      '--cache-dir', rescueCache,
      '--no-cache',
      '--no-progress',
    ]

    console.warn(
      `[docs-build] Shared-cache retries were exhausted for ${requested}. `
      + 'Running one isolated no-cache rescue attempt.',
    )
    console.log(`[docs-build] ${formatBunInvocation(rescueArgs)}`)
    const rescueResult = await runBunStreaming(rescueArgs, { cache: rescueCache })
    const rescueVerification = !rescueResult.error && rescueResult.status === 0
      ? verifyVitePressInstall()
      : undefined

    if (!rescueResult.error && rescueResult.status === 0 && rescueVerification?.ok) {
      writeInstallState({ fingerprint, bunVersion })
      console.log(`[docs-build] ${requested} dependencies installed through the isolated rescue cache and statically verified against bun.lock.`)
      removeTree(rescueCache, 'the isolated documentation rescue cache', { required: false })
      return rescueVerification.cliPath
    }

    lastOutput = [
      rescueResult.stdout || '',
      rescueResult.stderr || '',
      rescueVerification && !rescueVerification.ok ? rescueVerification.reason : '',
    ].filter(Boolean).join('\n')
    lastFailure = rescueResult.error || new Error(
      rescueResult.status === 0
        ? `VitePress rescue verification failed: ${rescueVerification?.reason || 'unknown verification failure'}`
        : `Bun isolated documentation install exited with status ${rescueResult.status ?? 'unknown'}.`,
    )
  }

  const lockHint = isWindowsFileLockFailure(lastOutput)
    ? ' Windows repeatedly blocked cache renames. Close VitePress, Nuxt, Node and Bun processes '
      + `and, when policy permits, exclude only ${nodeModules} plus ${cacheDir} from real-time scanning.`
    : ''

  throw new Error(
    `[docs-build] Unable to install verified ${requested} dependencies.${lockHint}`,
    { cause: lastFailure },
  )
}

const vitePressCli = await installDocsDependencies()
console.log(`[docs-build] Starting the ${requested} VitePress build with Node.js.`)
const build = await runStreaming(process.execPath, [vitePressCli, 'build', '.'], {
  timeoutMs: buildTimeoutMs,
  heartbeatLabel: `${requested} VitePress build`,
})
if (build.timedOut) {
  throw new Error(
    `[docs-build] VitePress build timed out for ${requested} after ${buildTimeoutMs} ms.`,
  )
}
if (build.error)
  throw build.error
if (build.status !== 0)
  throw new Error(`[docs-build] VitePress build failed for ${requested} with exit ${build.status ?? 'unknown'}.`)

console.log(`[docs-build] VitePress build completed for ${requested}.`)
