import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { requireBunExecutable } from './lib/bun-executable.mjs'
import { installStarterReleaseDependencies } from './lib/starter-release-installer.mjs'
import { provisionStarterReleaseMongo } from './lib/starter-release-mongodb.mjs'
import { recordArtifactValidation, resolveReleaseArtifact } from './lib/release-artifact.mjs'

const root = resolve(import.meta.dirname, '..')
const starterSource = resolve(root, 'examples/nfz-quasar-unocss-pinia-starter')
const bun = requireBunExecutable()

const FEATHERS_VERSION = '5.0.49'
const FEATHERS_RUNTIME_PACKAGES = [
  '@feathersjs/adapter-commons',
  '@feathersjs/authentication',
  '@feathersjs/authentication-local',
  '@feathersjs/commons',
  '@feathersjs/errors',
  '@feathersjs/feathers',
  '@feathersjs/mongodb',
  '@feathersjs/schema',
  '@feathersjs/transport-commons',
]

function packageJsonPath(nodeModulesRoot, packageName) {
  return join(nodeModulesRoot, ...packageName.split('/'), 'package.json')
}

function assertFreshStarterFeathersConvergence(starterDir) {
  const rootNodeModules = join(starterDir, 'node_modules')
  const nestedNodeModules = join(rootNodeModules, 'nuxt-feathers-zod', 'node_modules')
  const installed = []

  for (const packageName of FEATHERS_RUNTIME_PACKAGES) {
    const rootPackagePath = packageJsonPath(rootNodeModules, packageName)
    if (!existsSync(rootPackagePath))
      continue

    const metadata = JSON.parse(readFileSync(rootPackagePath, 'utf8'))
    installed.push(`${packageName}@${metadata.version}`)
    if (metadata.version !== FEATHERS_VERSION) {
      throw new Error(
        `[starter-release] Fresh starter resolved ${packageName}@${metadata.version}; expected the certified Feathers train ${FEATHERS_VERSION}.`,
      )
    }

    const nestedPackagePath = packageJsonPath(nestedNodeModules, packageName)
    if (existsSync(nestedPackagePath)) {
      const nestedMetadata = JSON.parse(readFileSync(nestedPackagePath, 'utf8'))
      throw new Error(
        `[starter-release] Duplicate Feathers type runtime detected for ${packageName}: root=${metadata.version} nested=${nestedMetadata.version}. `
        + 'The packaged starter must dedupe NFZ and application Feathers packages to one physical train.',
      )
    }
  }

  const lockPath = join(starterDir, 'bun.lock')
  if (existsSync(lockPath)) {
    const starterLock = readFileSync(lockPath, 'utf8')
    const mixed = [...starterLock.matchAll(/"@feathersjs\/[a-z0-9-]+@5\.0\.(?!49\b)\d+"/giu)]
      .map(match => match[0])
    if (mixed.length > 0) {
      throw new Error(
        `[starter-release] Fresh starter lock contains mixed Feathers v5 records: ${[...new Set(mixed)].join(', ')}`,
      )
    }
  }

  console.log(`[starter-release] Fresh starter Feathers runtime converged on ${FEATHERS_VERSION}: ${installed.join(', ')}`)
}

async function main() {
  const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const artifact = resolveReleaseArtifact(root)
  if (artifact.packageJson.version !== rootPackage.version)
    throw new Error('The release candidate version does not match package.json.')

  console.log(`[starter-release] Validating exact candidate: ${artifact.tarballPath}`)
  console.log(`[starter-release] Candidate SHA-256: ${artifact.sha256}`)

  const work = mkdtempSync(join(tmpdir(), 'nfz-starter-release-'))
  const starter = join(work, 'starter')
  let mongoRuntime

  try {
    mongoRuntime = await provisionStarterReleaseMongo()
    cpSync(starterSource, starter, { recursive: true })
    const packagePath = join(starter, 'package.json')
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
    pkg.dependencies['nuxt-feathers-zod'] = `file:${artifact.tarballPath.replace(/\\/g, '/')}`
    writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)

    const env = {
      ...process.env,
      MONGODB_URL: mongoRuntime.url,
      NFZ_DEMO_ENABLED: 'true',
      NFZ_DEMO_USER: process.env.NFZ_DEMO_USER || 'admin',
      NFZ_DEMO_PASSWORD: process.env.NFZ_DEMO_PASSWORD || 'NfzStarter-Ci-2026!',
    }

    const installResult = await installStarterReleaseDependencies({
      bun,
      starterDir: starter,
      workDir: work,
      env,
      expectedNfzVersion: rootPackage.version,
    })
    console.log(
      `[starter-release] dependency installation modes: initial=${installResult.initial.mode} `
      + `frozen=${installResult.frozen.mode}`,
    )

    assertFreshStarterFeathersConvergence(starter)

    for (const script of ['prepare', 'typecheck', 'build', 'runtime:doctor', 'e2e:ci'])
      execFileSync(bun, ['run', script], { cwd: starter, env, stdio: 'inherit' })

    recordArtifactValidation(root, 'starter', artifact, {
      lifecycle: ['prepare', 'typecheck', 'build', 'runtime:doctor', 'e2e:ci'],
    })
    console.log('[starter-release] Exact candidate passed prepare, typecheck, build, doctor and production REST E2E.')
  }
  finally {
    await mongoRuntime?.stop()
    rmSync(work, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
