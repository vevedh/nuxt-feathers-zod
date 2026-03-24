import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const rootDir = resolve(process.cwd())
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

writeFileSync(
  resolve(outDir, 'package.json'),
  `${JSON.stringify({ type: 'module' }, null, 2)}
`,
)
console.log(`[nuxt-feathers-zod] CLI built: ${outFile}`)
