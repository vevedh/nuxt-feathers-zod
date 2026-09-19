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
import { isAbsolute, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { requireBunExecutable } from './lib/bun-executable.mjs'
import { createWindowsInstallFingerprint } from './lib/windows-install-fingerprint.mjs'
import {
  isFrozenLockfileMismatch,
  isRetryableInstallFailure,
  isWindowsFileLockFailure,
  parsePositiveInteger,
  resolveAttemptCount,
  resolveNetworkConcurrency,
  resolveRetryDelayMs,
  shouldAttemptInPlaceReconciliation,
  shouldReuseInstall,
} from './lib/windows-install-policy.mjs'
import {
  formatWindowsInstallVerificationFailure,
  verifyWindowsInstall,
} from './lib/windows-install-verification.mjs'

const root = resolve(import.meta.dirname, '..')
const bun = requireBunExecutable()
const force = process.argv.includes('--force')
const checkOnly = process.argv.includes('--check')
const frozenLockfile = !process.argv.includes('--no-frozen-lockfile')
const attemptsArgument = process.argv.find(argument => argument.startsWith('--attempts='))?.split('=', 2)[1]
const cacheArgument = process.argv.find(argument => argument.startsWith('--cache-dir='))?.split('=', 2)[1]
const attempts = resolveAttemptCount(attemptsArgument || process.env.NFZ_WINDOWS_INSTALL_ATTEMPTS)
const initialNetworkConcurrency = parsePositiveInteger(process.env.NFZ_WINDOWS_NETWORK_CONCURRENCY, 8)
const nodeModules = resolve(root, 'node_modules')
const stateRoot = resolve(root, '.bun-cache', 'windows-install')
const configuredCache = String(cacheArgument || process.env.NFZ_WINDOWS_CACHE_DIR || '').trim()
const defaultSharedCacheRoot = process.platform === 'win32' && process.env.LOCALAPPDATA
  ? resolve(process.env.LOCALAPPDATA, 'nuxt-feathers-zod', 'bun-install-cache')
  : resolve(stateRoot, 'shared-cache')
const cacheDir = configuredCache
  ? (isAbsolute(configuredCache) ? configuredCache : resolve(root, configuredCache))
  : defaultSharedCacheRoot
const stateFile = resolve(stateRoot, 'install-state.json')

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
      console.warn(`[install:windows] Could not clean ${label}: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }

    throw new Error(
      `[install:windows] Unable to clean ${label} at ${path}. Close Nuxt, Vite, Vitest, Playwright, Node and Bun processes, then retry.`,
      { cause: error },
    )
  }
}

function removeTransientCacheEntries() {
  if (!existsSync(cacheDir))
    return

  for (const entry of readdirSync(cacheDir, { withFileTypes: true })) {
    if (!entry.name.startsWith('.'))
      continue
    removeTree(resolve(cacheDir, entry.name), `the transient Bun cache entry ${entry.name}`, { required: false })
  }
}

function verifyInstall() {
  return verifyWindowsInstall({ root })
}

function getBunVersion() {
  const result = spawnSync(bun, ['--version'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  })
  if (result.error || result.status !== 0)
    throw result.error || new Error(`Bun version lookup exited with status ${result.status ?? 'unknown'}.`)
  return String(result.stdout || '').trim()
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path) : Buffer.from('')
}

function createInstallFingerprint(bunVersion) {
  return createWindowsInstallFingerprint({
    packageJsonText: readOptional(resolve(root, 'package.json')),
    lockfileBytes: readOptional(resolve(root, 'bun.lock')),
    npmrcBytes: readOptional(resolve(root, '.npmrc')),
    bunVersion,
    frozenLockfile,
    ignoreScripts: true,
  })
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

function writeInstallState({ fingerprintDetails, bunVersion }) {
  mkdirSync(stateRoot, { recursive: true })
  writeFileSync(stateFile, `${JSON.stringify({
    schemaVersion: 3,
    fingerprintKind: 'dependency-resolution-v1',
    fingerprint: fingerprintDetails.fingerprint,
    dependencyManifestSha256: fingerprintDetails.dependencyManifestSha256,
    lockfileSha256: fingerprintDetails.lockfileSha256,
    npmrcSha256: fingerprintDetails.npmrcSha256,
    bunVersion,
    cacheDir,
    verifiedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8')
}

function appendCapturedOutput(current, chunk) {
  const limit = 4 * 1024 * 1024
  const combined = `${current}${chunk}`
  return combined.length > limit ? combined.slice(-limit) : combined
}

function runBunInstall(args) {
  return new Promise((resolveProcess) => {
    const child = spawn(bun, args, {
      cwd: root,
      env: {
        ...process.env,
        BUN_INSTALL_CACHE_DIR: cacheDir,
      },
      shell: false,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let spawnError

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
    child.once('close', (status) => {
      resolveProcess({ error: spawnError, status, stdout, stderr })
    })
  })
}

const bunVersion = getBunVersion()
const fingerprintDetails = createInstallFingerprint(bunVersion)
const fingerprint = fingerprintDetails.fingerprint
const state = readInstallState()
const initialVerification = verifyInstall()
const installVerified = initialVerification.ok
const stateMatches = state?.schemaVersion === 3
  && state?.fingerprintKind === 'dependency-resolution-v1'
  && state?.fingerprint === fingerprint
const legacyState = state?.schemaVersion === 2 && typeof state?.fingerprint === 'string'

if (checkOnly) {
  if (!stateMatches || !installVerified) {
    throw new Error(
      '[install:windows] The current dependency tree is not verified for the dependency-resolution manifest, bun.lock, .npmrc and Bun version. '
      + 'Run `bun run install:windows` before using a skip-install verification command.\n'
      + formatWindowsInstallVerificationFailure(initialVerification),
    )
  }
  console.log('[install:windows] Existing dependency tree is verified and matches the current dependency-resolution state.')
  process.exit(0)
}

if (shouldReuseInstall({ force, stateMatches, installVerified })) {
  console.log('[install:windows] Existing dependency tree already matches dependency resolution inputs, bun.lock and Bun. Installation skipped.')
  console.log('[install:windows] Use `bun run install:windows -- --force` to force a clean reinstall.')
  process.exit(0)
}

mkdirSync(stateRoot, { recursive: true })
mkdirSync(cacheDir, { recursive: true })

if (shouldAttemptInPlaceReconciliation({
  force,
  nodeModulesPresent: existsSync(nodeModules),
  stateMatches,
  installVerified,
})) {
  const reconciliationArgs = [
    'install',
    ...(frozenLockfile ? ['--frozen-lockfile'] : []),
    '--backend=copyfile',
    '--linker=hoisted',
    '--concurrent-scripts=1',
    '--ignore-scripts',
    `--network-concurrency=${initialNetworkConcurrency}`,
    '--cache-dir', cacheDir,
    '--no-progress',
  ]

  const reconciliationReason = legacyState
    ? 'Legacy install state detected.'
    : stateMatches
      ? 'The dependency install state matches, but runtime probes show an incomplete node_modules tree.'
      : 'Dependency resolution inputs changed while node_modules still exists.'

  console.log(`[install:windows] ${reconciliationReason} Reconciling the existing node_modules tree in place before any destructive cleanup.`)
  console.log(`[install:windows] ${bun} ${reconciliationArgs.join(' ')}`)
  const reconciliationResult = await runBunInstall(reconciliationArgs)
  const reconciliationVerification = !reconciliationResult.error && reconciliationResult.status === 0
    ? verifyInstall()
    : undefined

  if (!reconciliationResult.error && reconciliationResult.status === 0 && reconciliationVerification?.ok) {
    writeInstallState({ fingerprintDetails, bunVersion })
    console.log('[install:windows] Existing dependency tree reconciled and verified in place without deleting node_modules.')
    process.exit(0)
  }

  const reconciliationVerificationFailure = reconciliationVerification && !reconciliationVerification.ok
    ? formatWindowsInstallVerificationFailure(reconciliationVerification)
    : ''
  const reconciliationOutput = [
    reconciliationResult.stdout || '',
    reconciliationResult.stderr || '',
    reconciliationVerificationFailure,
  ].filter(Boolean).join('\n')

  if (frozenLockfile && isFrozenLockfileMismatch(reconciliationOutput)) {
    throw new Error(
      '[install:windows] bun.lock does not match the current dependency-resolution manifest. Refusing destructive node_modules cleanup because deleting installed files cannot repair a frozen-lock mismatch. Regenerate the canonical lockfile with the project maintenance command, then retry `bun run install:windows`.',
      { cause: reconciliationResult.error || new Error(`Bun install exited with status ${reconciliationResult.status ?? 'unknown'}.`) },
    )
  }

  if (isWindowsFileLockFailure(reconciliationOutput)) {
    throw new Error(
      '[install:windows] Windows locked an existing dependency while NFZ was reconciling node_modules in place. The tree was preserved instead of attempting a destructive cleanup that would hit the same lock. Close Nuxt, Vite, Vitest, Playwright, Node and Bun processes, then retry.',
      { cause: reconciliationResult.error || new Error(`Bun install exited with status ${reconciliationResult.status ?? 'unknown'}.`) },
    )
  }

  console.warn('[install:windows] Non-destructive dependency reconciliation did not complete cleanly. Falling back to the existing clean/retry recovery sequence.')
}

console.log('[install:windows] Dependency lifecycle scripts are skipped during installation; the explicit verification gate runs project preparation and builds once afterward.')
removeTree(nodeModules, 'the incomplete node_modules directory')
removeTransientCacheEntries()

let lastFailure
let lastOutput = ''
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const networkConcurrency = resolveNetworkConcurrency(attempt, initialNetworkConcurrency)
  const args = [
    'install',
    ...(frozenLockfile ? ['--frozen-lockfile'] : []),
    '--backend=copyfile',
    '--linker=hoisted',
    '--concurrent-scripts=1',
    '--ignore-scripts',
    `--network-concurrency=${networkConcurrency}`,
    '--cache-dir', cacheDir,
    '--no-progress',
  ]

  console.log(`[install:windows] Attempt ${attempt}/${attempts} (shared cache, network concurrency=${networkConcurrency})`)
  console.log(`[install:windows] ${bun} ${args.join(' ')}`)

  const result = await runBunInstall(args)

  const verification = !result.error && result.status === 0
    ? verifyInstall()
    : undefined
  const verificationFailure = verification && !verification.ok
    ? formatWindowsInstallVerificationFailure(verification)
    : ''

  lastOutput = [
    result.stdout || '',
    result.stderr || '',
    verificationFailure,
  ].filter(Boolean).join('\n')

  if (!result.error && result.status === 0 && verification?.ok) {
    writeInstallState({ fingerprintDetails, bunVersion })
    console.log('[install:windows] Dependencies installed and verified successfully.')
    console.log(`[install:windows] Reusable cache: ${cacheDir}`)
    process.exit(0)
  }

  if (!result.error && result.status === 0 && verification && !verification.ok) {
    console.error('[install:windows] Bun completed with exit code 0, but the post-install runtime probes failed:')
    console.error(verificationFailure)
    lastFailure = new Error(`Bun install exited successfully, but dependency verification failed.\n${verificationFailure}`)
  }
  else {
    lastFailure = result.error || new Error(`Bun install exited with status ${result.status ?? 'unknown'}.`)
  }

  const retryable = result.status === 0 && verification && !verification.ok
    ? true
    : isRetryableInstallFailure(lastOutput)
  if (!retryable || attempt >= attempts)
    break

  const locked = isWindowsFileLockFailure(lastOutput)
  const retryDelay = resolveRetryDelayMs(attempt, lastOutput)
  console.warn(
    locked
      ? `[install:windows] Windows temporarily locked one or more cache entries. Reusing the successful downloads and retrying after ${retryDelay} ms.`
      : `[install:windows] Transient install failure detected. Reusing the cache and retrying after ${retryDelay} ms.`,
  )

  removeTree(nodeModules, 'the incomplete node_modules directory')
  removeTransientCacheEntries()
  await delay(retryDelay)
}


if (isWindowsFileLockFailure(lastOutput)) {
  const rescueCacheDir = resolve(
    tmpdir(),
    `nfz-bun-rescue-${createHash('sha256').update(root).digest('hex').slice(0, 12)}`,
  )
  removeTree(rescueCacheDir, 'the isolated Bun rescue cache', { required: false })
  mkdirSync(rescueCacheDir, { recursive: true })
  removeTree(nodeModules, 'the incomplete node_modules directory')

  const rescueArgs = [
    'install',
    ...(frozenLockfile ? ['--frozen-lockfile'] : []),
    '--backend=copyfile',
    '--linker=hoisted',
    '--concurrent-scripts=1',
    '--ignore-scripts',
    '--network-concurrency=1',
    '--cache-dir', rescueCacheDir,
    '--no-cache',
    '--no-progress',
  ]

  console.warn('[install:windows] Shared-cache retries were exhausted. Running one isolated no-manifest-cache rescue attempt with lifecycle scripts disabled.')
  console.log(`[install:windows] ${bun} ${rescueArgs.join(' ')}`)
  const rescueResult = await runBunInstall(rescueArgs)
  const rescueVerification = !rescueResult.error && rescueResult.status === 0
    ? verifyInstall()
    : undefined

  if (!rescueResult.error && rescueResult.status === 0 && rescueVerification?.ok) {
    writeInstallState({ fingerprintDetails, bunVersion })
    console.log('[install:windows] Dependencies installed and verified successfully through the isolated rescue cache.')
    console.log(`[install:windows] Shared cache retained at: ${cacheDir}`)
    removeTree(rescueCacheDir, 'the isolated Bun rescue cache', { required: false })
    process.exit(0)
  }

  const rescueVerificationFailure = rescueVerification && !rescueVerification.ok
    ? formatWindowsInstallVerificationFailure(rescueVerification)
    : ''
  lastOutput = [
    rescueResult.stdout || '',
    rescueResult.stderr || '',
    rescueVerificationFailure,
  ].filter(Boolean).join('\n')
  lastFailure = rescueResult.error || new Error(`Bun isolated rescue install exited with status ${rescueResult.status ?? 'unknown'}.`)
}

const lockHint = isWindowsFileLockFailure(lastOutput)
  ? ' Windows repeatedly blocked cache renames, including the isolated rescue cache. Close Node/Bun/Nuxt/Vitest/Playwright processes and temporarily exclude only node_modules plus the configured user-level Bun cache from real-time scanning when your security policy permits it.'
  : ''

throw new Error(
  `[install:windows] Installation failed after the attempted recovery sequence. The reusable cache was preserved at ${cacheDir}.${lockHint}`,
  { cause: lastFailure },
)
