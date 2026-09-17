import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { recordArtifactValidation, resolveReleaseArtifact } from './lib/release-artifact.mjs'
import { createExactReleaseConsumerPackage } from './lib/release-consumer-install.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')
const keepTemp = process.env.NFZ_SMOKE_KEEP_TEMP === 'true'
const fullBuild = process.env.NFZ_TARBALL_SMOKE_BUILD === 'true'

function run(cmd, args, cwd, options = {}) {
  console.log(`[nuxt-feathers-zod] $ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32' && ['npx', 'bunx', 'npm', 'bun'].includes(cmd),
    env: options.env || process.env,
  })

  if (result.error) {
    throw new Error([
      `[nuxt-feathers-zod] Command failed to start: ${cmd} ${args.join(' ')}`,
      String(result.error),
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'))
  }

  if (result.status !== 0) {
    throw new Error([
      `[nuxt-feathers-zod] Command failed: ${cmd} ${args.join(' ')}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'))
  }

  return (result.stdout || '').trim()
}

function hasCommand(cmd, args = ['--version']) {
  const result = spawnSync(cmd, args, {
    stdio: 'ignore',
    shell: process.platform === 'win32' && ['npx', 'bunx', 'npm', 'bun'].includes(cmd),
  })
  return result.status === 0
}

export function selectSmokePackageManager({
  platform,
  forced,
  runningWithBun,
  bunAvailable,
  npmAvailable,
}) {
  if (forced) {
    if (!['bun', 'npm'].includes(forced))
      throw new Error(`[nuxt-feathers-zod] Unsupported NFZ_SMOKE_PM value: ${forced}`)
    return forced
  }

  if (platform === 'win32' && npmAvailable)
    return 'npm'

  if (runningWithBun && bunAvailable)
    return 'bun'
  if (npmAvailable)
    return 'npm'
  if (bunAvailable)
    return 'bun'

  throw new Error('[nuxt-feathers-zod] No supported package manager found (bun or npm required). Set NFZ_SMOKE_PM=bun or NFZ_SMOKE_PM=npm to force a package manager.')
}

export function createBunInstallArguments(cacheDir) {
  return [
    'install',
    '--backend=copyfile',
    '--linker=hoisted',
    '--concurrent-scripts=1',
    '--network-concurrency=8',
    '--cache-dir',
    cacheDir,
    '--no-progress',
  ]
}

function detectPackageManager() {
  const execPath = String(process.env.npm_execpath || process.env.npm_config_user_agent || '')
  const bunAvailable = hasCommand('bun', ['--version']) && hasCommand('bunx', ['--version'])
  const npmAvailable = hasCommand('npm', ['--version']) && hasCommand('npx', ['--version'])

  return selectSmokePackageManager({
    platform: process.platform,
    forced: process.env.NFZ_SMOKE_PM,
    runningWithBun: Boolean(process.versions?.bun || /\bbun\b/i.test(execPath)),
    bunAvailable,
    npmAvailable,
  })
}

function install(pm, cwd, workDir) {
  if (pm === 'bun') {
    const cacheDir = join(workDir, '.bun-cache')
    run('bun', createBunInstallArguments(cacheDir), cwd, {
      env: {
        ...process.env,
        BUN_INSTALL_CACHE_DIR: cacheDir,
      },
    })
    return
  }

  run('npm', ['install', '--no-fund', '--no-audit', '--legacy-peer-deps'], cwd)
}

function execPackageBin(pm, cwd, args) {
  if (pm === 'bun')
    return run('bunx', args, cwd)
  return run('npx', args, cwd)
}

async function main() {
  const pm = detectPackageManager()
  const artifact = resolveReleaseArtifact(rootDir)
  const tarballPath = artifact.tarballPath
  const workDir = await mkdtemp(join(tmpdir(), 'nfz-tarball-smoke-'))
  const consumerDir = join(workDir, 'consumer')
  const fixtureDir = join(rootDir, 'test', 'fixtures', 'tarball-consumer-template')

  console.log(`[nuxt-feathers-zod] Smoke workspace: ${workDir}`)
  console.log(`[nuxt-feathers-zod] Exact candidate: ${tarballPath}`)
  console.log(`[nuxt-feathers-zod] Candidate SHA-256: ${artifact.sha256}`)
  console.log(`[nuxt-feathers-zod] Using package manager: ${pm}`)
  if (process.platform === 'win32' && pm === 'npm' && !process.env.NFZ_SMOKE_PM)
    console.log('[nuxt-feathers-zod] Windows consumer install uses npm by default to avoid Bun shared-cache EPERM failures. Set NFZ_SMOKE_PM=bun to force the isolated-cache Bun path.')

  await cp(fixtureDir, consumerDir, { recursive: true })
  console.log(`[nuxt-feathers-zod] Consumer fixture copied to: ${consumerDir}`)

  const consumerPkg = createExactReleaseConsumerPackage({
    root: rootDir,
    name: 'nfz-tarball-smoke-consumer',
    scripts: {
      prepare: 'nuxi prepare',
      build: 'nuxi build',
    },
    dependencies: {
      'nuxt-feathers-zod': `file:${tarballPath.replace(/\\/g, '/')}`,
    },
  })

  await writeFile(join(consumerDir, 'package.json'), `${JSON.stringify(consumerPkg, null, 2)}\n`, 'utf8')
  install(pm, consumerDir, workDir)
  execPackageBin(pm, consumerDir, ['nuxi', 'prepare'])

  const verifyFile = join(consumerDir, 'verify-package.mjs')
  await writeFile(verifyFile, `
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, resolve } from 'node:path'

const targets = [
  '.',
  './options',
  './client-runtime',
  './server-bootstrap',
  './server-app-utils',
  './server-mongodb',
  './server-keycloak',
  './auth-utils',
  './config-utils',
]

const pkgRoot = join(process.cwd(), 'node_modules', 'nuxt-feathers-zod')
const pkgJsonPath = join(pkgRoot, 'package.json')
const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'))
const exportsMap = pkgJson.exports || {}

const resolved = {
  packageJson: pkgJsonPath,
  packageName: pkgJson.name,
  packageVersion: pkgJson.version,
  checkedExports: {},
}

for (const key of targets) {
  const entry = exportsMap[key]
  if (!entry)
    throw new Error('Missing export entry: ' + key)

  const importTarget = typeof entry === 'string'
    ? entry
    : entry.import || entry.default || entry.require || entry.types

  if (!importTarget)
    throw new Error('Missing import/default target for export: ' + key)

  const abs = resolve(pkgRoot, importTarget)
  await access(abs, constants.F_OK)
  resolved.checkedExports[key] = abs
}

console.log(JSON.stringify(resolved, null, 2))
`, 'utf8')

  run('node', [verifyFile], consumerDir)
  const installedCli = join(consumerDir, 'node_modules', 'nuxt-feathers-zod', 'bin', 'nfz')
  run('node', [installedCli, '--help'], consumerDir)

  const starterTarget = 'generated-starter'
  run('node', [
    installedCli,
    'init',
    'starter',
    '--preset',
    'quasar-unocss-pinia-auth',
    '--dir',
    starterTarget,
  ], consumerDir)
  for (const requiredStarterFile of [
    'package.json',
    'nuxt.config.ts',
    '.env.example',
    'app/app.vue',
  ]) {
    const generatedPath = join(consumerDir, starterTarget, requiredStarterFile)
    if (!existsSync(generatedPath))
      throw new Error(`[nuxt-feathers-zod] Installed CLI did not generate starter file: ${generatedPath}`)
  }

  if (fullBuild)
    execPackageBin(pm, consumerDir, ['nuxi', 'build'])

  const installedPkg = JSON.parse(await readFile(join(consumerDir, 'node_modules', 'nuxt-feathers-zod', 'package.json'), 'utf8'))
  if (installedPkg.version !== artifact.packageJson.version)
    throw new Error('[nuxt-feathers-zod] Installed tarball version does not match the candidate version.')

  recordArtifactValidation(rootDir, 'consumer', artifact, {
    packageManager: pm,
    fullBuild,
    generatedStarter: true,
  })
  console.log(`[nuxt-feathers-zod] Exact candidate smoke succeeded (${pm}) in ${consumerDir}`)
  if (keepTemp)
    console.log(`[nuxt-feathers-zod] Temporary workspace preserved: ${workDir}`)
  else
    await rm(workDir, { recursive: true, force: true })
}

if (resolve(process.argv[1] || '') === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
