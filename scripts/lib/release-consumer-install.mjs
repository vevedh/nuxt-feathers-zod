import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireBunExecutable } from './bun-executable.mjs'
import { resolveNpmCliPath } from './npm-cli.mjs'

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000
const DEFAULT_ATTEMPTS = 2
const DEFAULT_RETRY_DELAY_MS = 2_000
const DEFAULT_NETWORK_CONCURRENCY = 8
const CERTIFIED_OVERRIDE_KEYS = ['vite', 'rolldown', 'vue']
const CERTIFIED_FULL_DEPENDENCY_KEYS = ['vite', 'rolldown', 'vue', 'typescript', 'zod']
const FEATHERS_PREFIX = '@feathersjs/'

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function sleepSync(ms) {
  if (ms <= 0)
    return
  const signal = new Int32Array(new SharedArrayBuffer(4))
  Atomics.wait(signal, 0, 0, ms)
}

function requireExactVersion(value, label) {
  const normalized = String(value || '').trim()
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalized))
    throw new Error(`[release-consumer] ${label} must be an exact version, found ${JSON.stringify(value)}`)
  return normalized
}

export function resolveReleaseConsumerPlatform(root) {
  if (!root)
    throw new Error('[release-consumer] Project root is required to resolve the certified consumer platform.')

  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const nuxt = requireExactVersion(pkg.devDependencies?.nuxt, 'devDependencies.nuxt')
  const overrides = {}
  for (const key of CERTIFIED_OVERRIDE_KEYS)
    overrides[key] = requireExactVersion(pkg.overrides?.[key], `overrides.${key}`)

  overrides.typescript = requireExactVersion(pkg.devDependencies?.typescript, 'devDependencies.typescript')

  const dependencies = {
    nuxt,
    vite: requireExactVersion(pkg.overrides?.vite, 'overrides.vite'),
    rolldown: requireExactVersion(pkg.overrides?.rolldown, 'overrides.rolldown'),
    vue: requireExactVersion(pkg.overrides?.vue, 'overrides.vue'),
    typescript: requireExactVersion(pkg.devDependencies?.typescript, 'devDependencies.typescript'),
    zod: requireExactVersion(pkg.devDependencies?.zod, 'devDependencies.zod'),
  }
  const databaseDependencies = {
    zod: dependencies.zod,
  }

  const feathersVersions = new Set()
  for (const [name, version] of Object.entries({
    ...(pkg.dependencies || {}),
    ...(pkg.peerDependencies || {}),
  })) {
    if (!name.startsWith(FEATHERS_PREFIX))
      continue
    const exact = requireExactVersion(version, `${name} certification version`)
    overrides[name] = exact
    feathersVersions.add(exact)
  }

  if (feathersVersions.size !== 1)
    throw new Error(`[release-consumer] Feathers certification overrides must converge on one exact version, found ${[...feathersVersions].join(', ')}`)

  for (const key of CERTIFIED_FULL_DEPENDENCY_KEYS) {
    if (!dependencies[key])
      throw new Error(`[release-consumer] Missing certified direct consumer dependency: ${key}`)
  }

  return {
    nuxt,
    dependencies,
    databaseDependencies,
    overrides,
    feathersVersion: [...feathersVersions][0],
  }
}

export function createExactReleaseConsumerPackage({
  root,
  name,
  dependencies = {},
  scripts,
  overrides = {},
  profile = 'nuxt',
} = {}) {
  if (!name)
    throw new Error('[release-consumer] Exact release consumer name is required.')
  if (!['nuxt', 'database'].includes(profile))
    throw new Error(`[release-consumer] Unknown exact release consumer profile: ${profile}`)

  const platform = resolveReleaseConsumerPlatform(root)
  const profileDependencies = profile === 'database'
    ? platform.databaseDependencies
    : platform.dependencies

  return {
    name,
    private: true,
    type: 'module',
    ...(scripts ? { scripts } : {}),
    dependencies: {
      ...dependencies,
      ...profileDependencies,
    },
    overrides: {
      ...platform.overrides,
      ...overrides,
    },
  }
}

export function resolveReleaseConsumerInstallPolicy(env = process.env) {
  return {
    timeoutMs: parsePositiveInteger(env.NFZ_RELEASE_CONSUMER_INSTALL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    attempts: parsePositiveInteger(env.NFZ_RELEASE_CONSUMER_INSTALL_ATTEMPTS, DEFAULT_ATTEMPTS),
    retryDelayMs: parsePositiveInteger(env.NFZ_RELEASE_CONSUMER_INSTALL_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS),
    networkConcurrency: parsePositiveInteger(env.NFZ_RELEASE_CONSUMER_NETWORK_CONCURRENCY, DEFAULT_NETWORK_CONCURRENCY),
  }
}

function resetPartialInstall(cwd, label) {
  for (const relative of ['node_modules', 'bun.lock', 'package-lock.json']) {
    try {
      rmSync(resolve(cwd, relative), {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      })
    }
    catch (error) {
      throw new Error(
        `[${label}] Unable to clear partial dependency-install state before retry: ${relative}.`,
        { cause: error },
      )
    }
  }
}

function resolveAttemptNetworkConcurrency(initial, attempt) {
  if (attempt <= 1)
    return initial
  if (attempt === 2)
    return Math.min(initial, 2)
  return 1
}

export function installExactReleaseConsumer({
  cwd,
  label = 'release-consumer',
  env = process.env,
  runner = spawnSync,
  sleep = sleepSync,
  bunExecutable,
} = {}) {
  if (!cwd)
    throw new Error(`[${label}] Exact release consumer workspace is required.`)

  const policy = resolveReleaseConsumerInstallPolicy(env)
  const bun = bunExecutable || requireBunExecutable(env)

  let lastFailure
  for (let attempt = 1; attempt <= policy.attempts; attempt++) {
    if (attempt > 1)
      resetPartialInstall(cwd, label)

    const networkConcurrency = resolveAttemptNetworkConcurrency(policy.networkConcurrency, attempt)
    const args = [
      'install',
      '--backend=copyfile',
      '--linker=hoisted',
      '--concurrent-scripts=1',
      '--ignore-scripts',
      '--omit=peer',
      `--network-concurrency=${networkConcurrency}`,
      '--no-progress',
    ]

    console.log(
      `[${label}] dependency install attempt ${attempt}/${policy.attempts} `
      + `(bun, timeout=${Math.ceil(policy.timeoutMs / 1000)}s, omit-peer, network-concurrency=${networkConcurrency}).`,
    )

    const result = runner(bun, args, {
      cwd,
      encoding: 'utf8',
      env,
      stdio: 'inherit',
      timeout: policy.timeoutMs,
      shell: false,
    })

    if (!result?.error && result?.status === 0) {
      if (attempt > 1)
        console.log(`[${label}] dependency install recovered on attempt ${attempt}/${policy.attempts}.`)

      const npmCliPath = resolveNpmCliPath()
      const npmCommand = npmCliPath
        ? process.execPath
        : (process.platform === 'win32' ? 'npm.cmd' : 'npm')
      return {
        installer: 'bun',
        bunCommand: bun,
        npmCommand,
        npmCliPath,
        policy,
        attemptsUsed: attempt,
      }
    }

    lastFailure = result?.error || new Error(
      `[${label}] bun install exited with status ${result?.status ?? 'unknown'}.`,
    )

    if (attempt < policy.attempts) {
      const timedOut = result?.error?.code === 'ETIMEDOUT'
      console.warn(
        `[${label}] dependency install ${timedOut ? 'timed out' : 'failed'} on attempt ${attempt}/${policy.attempts}. `
        + `Retrying from a clean consumer workspace after ${policy.retryDelayMs} ms.`,
      )
      sleep(policy.retryDelayMs)
    }
  }

  throw new Error(
    `[${label}] Unable to install exact-candidate consumer dependencies with Bun after ${policy.attempts} attempt(s). `
    + 'Tune NFZ_RELEASE_CONSUMER_INSTALL_TIMEOUT_MS, NFZ_RELEASE_CONSUMER_INSTALL_ATTEMPTS or '
    + 'NFZ_RELEASE_CONSUMER_NETWORK_CONCURRENCY for unusually slow hosts. Database certification intentionally omits peer auto-installation; '
    + 'the separate npm clean-consumer gate remains responsible for validating the published Nuxt peer contract.',
    { cause: lastFailure },
  )
}
