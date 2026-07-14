import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'

interface SmokeCommand {
  readonly name: string
  readonly args: readonly string[]
  readonly mustContain?: readonly string[]
  readonly prepare?: (cwd: string) => void
}

const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node'
const cliModuleEntrypoint = resolve(process.cwd(), 'dist/cli/index.mjs')

if (!existsSync(cliModuleEntrypoint)) {
  throw new Error(`CLI entrypoint not found: ${cliModuleEntrypoint}. Run \`bun run cli:build\` or \`bun run build\` first.`)
}

function runCapture(command: [string, ...string[]], cwd: string): string {
  const [bin, ...args] = command
  const result = spawnSync(bin, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 30_000,
  })

  const output = `${result.stdout || ''}\n${result.stderr || ''}`

  if (result.error) {
    throw new Error(`Command failed to start or timed out: ${command.join(' ')}\n${String(result.error)}\n${output}`)
  }

  if (result.signal) {
    throw new Error(`Command terminated by signal ${result.signal}: ${command.join(' ')}\n${output}`)
  }

  if (result.status !== 0) {
    throw new Error(`Command failed (${String(result.status)}): ${command.join(' ')}\n${output}`)
  }

  return output
}

function writeMinimalNuxtProject(cwd: string): void {
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({ type: 'module', private: true }, null, 2))
  writeFileSync(join(cwd, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    auth: true,
  },
})
`)
}

const commands: readonly SmokeCommand[] = [
  { name: 'help', args: ['--help'], mustContain: ['nuxt-feathers-zod'] },
  { name: 'doctor', args: ['doctor'], prepare: writeMinimalNuxtProject, mustContain: ['auth'] },

  // Init commands need a minimal Nuxt project because they patch nuxt.config.ts.
  // Their dry-run output is intentionally generic (`[dry] patch nuxt.config.ts`),
  // so assert on the dry-run marker rather than brittle command labels.
  { name: 'init embedded dry', args: ['init', 'embedded', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['dry'] },
  { name: 'init remote dry', args: ['init', 'remote', '--url', 'https://api.example.test', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['dry'] },
  { name: 'init templates dry', args: ['init', 'templates', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['templates', 'dry'] },

  { name: 'add service dry', args: ['add', 'service', 'users', '--dry', 'true', '--adapter', 'mongodb', '--idField', '_id'], prepare: writeMinimalNuxtProject, mustContain: ['users'] },
  { name: 'add file-service dry', args: ['add', 'file-service', 'uploads', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['uploads'] },
  { name: 'add middleware route dry', args: ['add', 'middleware', 'auth-keycloak', '--target', 'route', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['auth-keycloak'] },
  { name: 'add mongodb-compose dry', args: ['add', 'mongodb-compose', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['docker-compose-db.yaml'] },
  { name: 'mongo management dry', args: ['mongo', 'management', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['mongo'] },
  { name: 'remote auth keycloak dry', args: ['remote', 'auth', 'keycloak', '--ssoUrl', 'https://sso.example.test', '--realm', 'demo', '--clientId', 'nfz-studio', '--dry', 'true'], prepare: writeMinimalNuxtProject, mustContain: ['dry'] },
]

for (const command of commands) {
  const cwd = mkdtempSync(join(tmpdir(), 'nfz-cli-full-smoke-'))

  try {
    command.prepare?.(cwd)
    const output = runCapture([nodeBin, cliModuleEntrypoint, ...command.args], cwd)

    for (const fragment of command.mustContain ?? []) {
      if (!output.toLowerCase().includes(fragment.toLowerCase())) {
        throw new Error(`[${command.name}] missing expected output fragment: ${fragment}\n--- output ---\n${output}`)
      }
    }

    console.info(`[ok] ${command.name}`)
  }
  finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

console.info('CLI full smoke OK')
