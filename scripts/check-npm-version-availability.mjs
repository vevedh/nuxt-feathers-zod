import { readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const name = String(pkg.name || '').trim()
const version = String(pkg.version || '').trim()

if (!name || !version) {
  console.error('[nuxt-feathers-zod] package.json must define a package name and version')
  process.exit(1)
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`[nuxt-feathers-zod] Invalid release version: ${version}`)
  process.exit(1)
}

const registry = String(process.env.NFZ_RELEASE_REGISTRY || 'https://registry.npmjs.org').replace(/\/+$/, '')
const packagePath = encodeURIComponent(name)
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 15_000)

try {
  const response = await fetch(`${registry}/${packagePath}/${encodeURIComponent(version)}`, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: controller.signal,
  })

  if (response.status === 404) {
    console.log(`[nuxt-feathers-zod] ${name}@${version} is available on ${registry}`)
    process.exit(0)
  }

  if (response.ok) {
    console.error(`[nuxt-feathers-zod] Refusing release: ${name}@${version} already exists on ${registry}`)
    process.exit(1)
  }

  console.error(`[nuxt-feathers-zod] Registry check failed with HTTP ${response.status}`)
  process.exit(1)
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[nuxt-feathers-zod] Registry check failed: ${message}`)
  process.exit(1)
}
finally {
  clearTimeout(timeout)
}
