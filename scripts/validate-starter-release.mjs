import { execFileSync } from 'node:child_process'
import {
  cpSync,
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
