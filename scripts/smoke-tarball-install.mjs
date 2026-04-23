import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const keepTemp = process.env.NFZ_SMOKE_KEEP_TEMP === 'true'
const fullBuild = process.env.NFZ_TARBALL_SMOKE_BUILD === 'true'

function run(cmd, args, cwd) {
  console.log(`[nuxt-feathers-zod] $ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32' && ['npx', 'bunx', 'npm', 'bun'].includes(cmd),
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

function detectPackageManager() {
  if (process.env.NFZ_SMOKE_PM)
    return process.env.NFZ_SMOKE_PM

  const execPath = String(process.env.npm_execpath || process.env.npm_config_user_agent || '')
  if (process.versions?.bun || /\bbun\b/i.test(execPath))
    return 'bun'
  if (/\bnpm\b/i.test(execPath))
    return 'npm'

  if (hasCommand('bun', ['--version']) && hasCommand('bunx', ['--version']))
    return 'bun'
  if (hasCommand('npm', ['--version']) && hasCommand('npx', ['--version']))
    return 'npm'

  throw new Error('[nuxt-feathers-zod] No supported package manager found (bun or npm required). Set NFZ_SMOKE_PM=bun or NFZ_SMOKE_PM=npm to force a package manager.')
}

function install(pm, cwd) {
  if (pm === 'bun')
    run('bun', ['install'], cwd)
  else
    run('npm', ['install', '--no-fund', '--no-audit'], cwd)
}

function detectPackTool(pm) {
  if (process.env.NFZ_SMOKE_PACK_PM)
    return process.env.NFZ_SMOKE_PACK_PM

  // npm pack is currently the most reliable cross-platform choice,
  // especially on Windows where `bun pm pack` can hang or provide
  // inconsistent stdout for destination-based packing.
  if (hasCommand('npm', ['--version']))
    return 'npm'

  return pm
}

function execPackageBin(pm, cwd, args) {
  if (pm === 'bun')
    return run('bunx', args, cwd)
  return run('npx', args, cwd)
}

async function main() {
  const pm = detectPackageManager()
  const workDir = await mkdtemp(join(tmpdir(), 'nfz-tarball-smoke-'))
  const consumerDir = join(workDir, 'consumer')
  const fixtureDir = join(rootDir, 'test', 'fixtures', 'tarball-consumer-template')

  if (!existsSync(join(rootDir, 'dist', 'module.mjs')))
    throw new Error('[nuxt-feathers-zod] dist/module.mjs not found. Run `bun run build` first.')

  if (!existsSync(join(rootDir, 'dist', 'cli', 'index.mjs')))
    throw new Error('[nuxt-feathers-zod] dist/cli/index.mjs not found. Run `bun run cli:build` first.')

  console.log(`[nuxt-feathers-zod] Smoke workspace: ${workDir}`)
  console.log(`[nuxt-feathers-zod] Using package manager: ${pm}`)

  const packPm = detectPackTool(pm)
  console.log(`[nuxt-feathers-zod] Using pack tool: ${packPm}`)

  const packOutput = packPm === 'bun'
    ? run('bun', ['pm', 'pack', '--destination', workDir], rootDir)
    : run('npm', ['pack', '--pack-destination', workDir], rootDir)
  const tarballCandidates = packOutput.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const tarballName = tarballCandidates.reverse().find(line => /\.tgz$/.test(line))
  if (!tarballName)
    throw new Error('[nuxt-feathers-zod] Unable to determine generated tarball name from pack command output.')

  const tarballPath = join(workDir, tarballName)
  if (!existsSync(tarballPath))
    throw new Error(`[nuxt-feathers-zod] Packed tarball not found at ${tarballPath}`)
  console.log(`[nuxt-feathers-zod] Packed tarball: ${tarballPath}`)

  await cp(fixtureDir, consumerDir, { recursive: true })
  console.log(`[nuxt-feathers-zod] Consumer fixture copied to: ${consumerDir}`)

  const consumerPkg = {
    name: 'nfz-tarball-smoke-consumer',
    private: true,
    type: 'module',
    scripts: {
      prepare: 'nuxi prepare',
      build: 'nuxi build',
    },
    dependencies: {
      nuxt: '^4.3.1',
      'nuxt-feathers-zod': `file:${tarballPath.replace(/\\/g, '/')}`,
    },
  }

  await writeFile(join(consumerDir, 'package.json'), `${JSON.stringify(consumerPkg, null, 2)}\n`, 'utf8')
  install(pm, consumerDir)
  execPackageBin(pm, consumerDir, ['nuxi', 'prepare'])

  const verifyFile = join(consumerDir, 'verify-package.mjs')
  await writeFile(verifyFile, `
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

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
  if (!entry) {
    throw new Error('Missing export entry: ' + key)
  }

  const importTarget = typeof entry === 'string'
    ? entry
    : entry.import || entry.default || entry.require || entry.types

  if (!importTarget) {
    throw new Error('Missing import/default target for export: ' + key)
  }

  const abs = resolve(pkgRoot, importTarget)
  await access(abs, constants.F_OK)
  resolved.checkedExports[key] = abs
}

console.log(JSON.stringify(resolved, null, 2))
`, 'utf8')

  run('node', [verifyFile], consumerDir)
  run('node', [join(consumerDir, 'node_modules', 'nuxt-feathers-zod', 'bin', 'nfz'), '--help'], consumerDir)

  if (fullBuild)
    execPackageBin(pm, consumerDir, ['nuxi', 'build'])

  const installedPkg = JSON.parse(await readFile(join(consumerDir, 'node_modules', 'nuxt-feathers-zod', 'package.json'), 'utf8'))
  if (installedPkg.version !== JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8')).version)
    throw new Error('[nuxt-feathers-zod] Installed tarball version does not match workspace package version.')

  console.log(`[nuxt-feathers-zod] Tarball smoke succeeded (${pm}) in ${consumerDir}`)
  if (keepTemp)
    console.log(`[nuxt-feathers-zod] Temporary workspace preserved: ${workDir}`)
  else
    await rm(workDir, { recursive: true, force: true })
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
