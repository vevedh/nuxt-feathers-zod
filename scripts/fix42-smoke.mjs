import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { assertInitEmbeddedArgs, assertInitRemoteArgs, assertServiceGenerationArgs, generateService, runCli } from '../src/cli/index.ts'

function ok(cond, msg) {
  if (!cond) throw new Error(`SMOKE_FAIL: ${msg}`)
}

assertServiceGenerationArgs({ _: [], collection: 'users' }, false, 'mongodb')
let failed = false
try { assertInitRemoteArgs({ _: [], websocketPath: '/socket.io' }, 'rest', false) } catch { failed = true }
ok(failed, 'expected invalid remote args to throw')
failed = false
try { assertInitEmbeddedArgs({ _: [], serveStaticPath: '/public' }, 'express', false) } catch { failed = true }
ok(failed, 'expected invalid embedded args to throw')

const root1 = await mkdtemp(join(tmpdir(), 'nfz-f42-'))
await writeFile(join(root1, 'package.json'), '{"name":"tmp"}\n')
await writeFile(join(root1, 'nuxt.config.ts'), 'export default defineNuxtConfig({})\n')
await runCli(['init', 'embedded', '--servicesDir', 'services', '--auth', '--swagger'], { cwd: root1, throwOnError: true })
const embeddedCfg = await readFile(join(root1, 'nuxt.config.ts'), 'utf8')
ok(embeddedCfg.includes("mode: 'embedded'"), 'embedded init missing mode')

const root2 = await mkdtemp(join(tmpdir(), 'nfz-f42-'))
await writeFile(join(root2, 'package.json'), '{"name":"tmp"}\n')
await writeFile(join(root2, 'nuxt.config.ts'), 'export default defineNuxtConfig({})\n')
await runCli(['init', 'remote', '--url', 'https://api.example.test', '--transport', 'rest', '--auth'], { cwd: root2, throwOnError: true })
const remoteCfg = await readFile(join(root2, 'nuxt.config.ts'), 'utf8')
ok(remoteCfg.includes("mode: 'remote'"), 'remote init missing mode')

const root3 = await mkdtemp(join(tmpdir(), 'nfz-f42-'))
await writeFile(join(root3, 'package.json'), '{"name":"tmp"}\n')
const servicesDir = join(root3, 'services')
await generateService({ projectRoot: root3, servicesDir, name: 'posts', adapter: 'memory', auth: false, idField: 'id', docs: false, dry: false, force: false })
await runCli(['auth', 'service', 'posts', '--enabled'], { cwd: root3, throwOnError: true })
const hooks = await readFile(join(servicesDir, 'posts', 'posts.hooks.ts'), 'utf8')
ok(hooks.includes("authenticate('jwt')"), 'auth service did not update hooks')
ok(existsSync(join(servicesDir, 'posts', 'posts.ts')), 'service file missing after auth service test')

console.log('FIX42_SMOKE_OK')
