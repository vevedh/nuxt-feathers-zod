import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const syncScript = resolve(rootDir, 'scripts/sync-release-metadata.mjs')
const syncResult = spawnSync(process.execPath, [syncScript], { cwd: rootDir, stdio: 'inherit', shell: false })
if (syncResult.error) {
  console.error('[nuxt-feathers-zod] Release metadata sync spawn error:', syncResult.error)
  process.exit(typeof syncResult.status === 'number' ? syncResult.status : 1)
}
if (typeof syncResult.status === 'number' && syncResult.status !== 0) {
  console.error(`[nuxt-feathers-zod] Release metadata sync failed with exit code ${syncResult.status}`)
  process.exit(syncResult.status)
}
const outFile = resolve(rootDir, 'dist/cli/index.mjs')
const outDir = dirname(outFile)
mkdirSync(outDir, { recursive: true })

const buildArgs = [
  'build',
  'src/cli/bin.ts',
  '--outfile',
  outFile,
  '--target=node',
  '--format=esm',
]

function quote(value) {
  if (!/[\s"]/.test(value))
    return value
  return `"${value.replace(/"/g, '\"')}"`
}

const command = `bun ${buildArgs.map(quote).join(' ')}`
const spawnCommand = process.platform === 'win32'
  ? (process.env.ComSpec || 'cmd.exe')
  : 'sh'
const spawnArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', command]
  : ['-lc', command]

console.log(`[nuxt-feathers-zod] CLI build command: ${spawnCommand} ${spawnArgs.join(' ')}`)
const result = spawnSync(spawnCommand, spawnArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
})

if (result.error) {
  console.error('[nuxt-feathers-zod] CLI build spawn error:', result.error)
  process.exit(typeof result.status === 'number' ? result.status : 1)
}

if (typeof result.status === 'number' && result.status !== 0) {
  console.error(`[nuxt-feathers-zod] CLI build failed with exit code ${result.status}`)
  process.exit(result.status)
}

const cliPackageJson = {
  name: 'nuxt-feathers-zod-cli-dist',
  private: true,
  type: 'module',
  bin: {
    'nuxt-feathers-zod': './index.mjs',
    nfz: './index.mjs',
  },
}

writeFileSync(
  resolve(outDir, 'package.json'),
  `${JSON.stringify(cliPackageJson, null, 2)}\n`,
)
console.log(`[nuxt-feathers-zod] CLI built: ${outFile}`)
console.log(`[nuxt-feathers-zod] CLI metadata written: ${resolve(outDir, 'package.json')}`)
