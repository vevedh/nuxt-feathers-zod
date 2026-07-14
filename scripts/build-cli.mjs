import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const bunRuntime = globalThis.Bun

if (!bunRuntime || typeof bunRuntime.build !== 'function') {
  console.error('[nuxt-feathers-zod] CLI build requires the Bun runtime. Run: bun run cli:build')
  process.exit(1)
}

const rootDir = resolve(process.cwd())
await import('./sync-release-metadata.mjs')

const outFile = resolve(rootDir, 'dist/cli/index.mjs')
const outDir = dirname(outFile)
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

console.log('[nuxt-feathers-zod] Building CLI with the Bun.build() API')
const result = await bunRuntime.build({
  entrypoints: [resolve(rootDir, 'src/cli/bin.ts')],
  outdir: outDir,
  root: rootDir,
  target: 'node',
  format: 'esm',
  splitting: true,
  minify: {
    syntax: true,
    whitespace: false,
    identifiers: false,
  },
  naming: {
    entry: 'index.mjs',
    chunk: 'chunks/[name]-[hash].mjs',
    asset: 'assets/[name]-[hash].[ext]',
  },
})

if (!result.success) {
  console.error('[nuxt-feathers-zod] CLI build failed:')
  for (const log of result.logs)
    console.error(log)
  process.exit(1)
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
