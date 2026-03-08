import { existsSync } from "node:fs"
import { readFile, readdir, stat } from "node:fs/promises"
import { join, resolve } from "node:path"

import consola from "consola"

function relativeToCwd(p: string) {
  return p.replace(process.cwd().replace(/\\/g, '/'), '.').replace(/\\/g, '/')
}

function findNuxtConfigPath(projectRoot: string): string | null {
  const candidates = [
    'nuxt.config.ts',
    'nuxt.config.mts',
    'nuxt.config.js',
    'nuxt.config.mjs',
  ].map(f => resolve(projectRoot, f))
  return candidates.find(f => existsSync(f)) ?? null
}

function parseStringArray(raw?: string) {
  if (!raw) return [] as string[]
  return raw
    .replace(/[\[\]]/g, '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => v.replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseMode(cfg: string) {
  return (cfg.match(/client\s*:\s*\{[\s\S]*?mode\s*:\s*[\\"\'](embedded|remote)[\\"\']/)?.[1]) ?? 'embedded(?)'
}

function parseRestPath(cfg: string) {
  return (cfg.match(/rest\s*:\s*\{[\s\S]*?path\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1]) ?? '/feathers'
}

function parseServicesDirs(cfg: string, projectRoot: string, mode: string) {
  const servicesDirsRaw = (() => {
    const arr = cfg.match(/servicesDirs\s*:\s*\[([^\]]*)\]/)?.[1]
    if (arr) return arr
    const single = cfg.match(/servicesDirs\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1]
    if (single) return JSON.stringify([single])
    const legacy = cfg.match(/servicesDir\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1]
    if (legacy) return JSON.stringify([legacy])
    return ''
  })()

  const servicesDirs = parseStringArray(servicesDirsRaw)
  if (!servicesDirs.length && mode !== 'remote') servicesDirs.push('services')

  const abs: string[] = []
  const seen = new Set<string>()
  for (const dir of servicesDirs) {
    const full = resolve(projectRoot, dir)
    const key = full.replace(/\\/g, '/').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    abs.push(full)
  }
  return abs
}

function parseRemoteUrl(cfg: string) {
  return cfg.match(/remote\s*:\s*\{[\s\S]*?url\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? ''
}

function parseRemoteTransport(cfg: string) {
  return cfg.match(/remote\s*:\s*\{[\s\S]*?transport\s*:\s*[\\"\'](socketio|rest|auto)[\\"\']/)?.[1] ?? ''
}

function parseWebsocketPath(cfg: string) {
  return cfg.match(/websocket\s*:\s*\{[\s\S]*?path\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? '/socket.io'
}

function parseRemoteAuth(cfg: string) {
  const enabled = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?enabled\s*:\s*(true|false)/)?.[1] ?? ''
  const payloadMode = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?payloadMode\s*:\s*[\\"\'](jwt|keycloak)[\\"\']/)?.[1] ?? ''
  const strategy = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?strategy\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? ''
  const tokenField = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?tokenField\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? ''
  const servicePath = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?servicePath\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? ''
  const reauth = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?reauth\s*:\s*(true|false)/)?.[1] ?? ''
  return { enabled, payloadMode, strategy, tokenField, servicePath, reauth }
}

function parseRemoteServices(cfg: string) {
  const servicesMatch = cfg.match(/services\s*:\s*\[/)
  if (servicesMatch?.index == null) return []

  const listStart = cfg.indexOf('[', servicesMatch.index)
  if (listStart === -1) return []

  let depth = 0
  let listEnd = -1
  for (let i = listStart; i < cfg.length; i++) {
    const char = cfg[i]
    if (char === '[') depth++
    else if (char === ']') {
      depth--
      if (depth === 0) {
        listEnd = i
        break
      }
    }
  }

  if (listEnd === -1) return []

  const block = cfg.slice(listStart + 1, listEnd)
  const names = [...block.matchAll(/path\s*:\s*[\"']([^"']+)[\"']/g)].map(m => m[1])
  return Array.from(new Set(names))
}

function parseKeycloak(cfg: string) {
  const serverUrl = cfg.match(/keycloak\s*:\s*\{[\s\S]*?serverUrl\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? ''
  const realm = cfg.match(/keycloak\s*:\s*\{[\s\S]*?realm\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? ''
  const clientId = cfg.match(/keycloak\s*:\s*\{[\s\S]*?clientId\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? ''
  return { serverUrl, realm, clientId }
}

async function detectEmbeddedServices(absServicesDirs: string[]) {
  const serviceNames: string[] = []
  for (const d of absServicesDirs) {
    if (!existsSync(d)) continue
    const entries = await readdir(d).catch(() => [])
    for (const ent of entries) {
      const p = join(d, ent)
      const st = await stat(p).catch(() => null)
      if (!st?.isDirectory()) continue
      const files = await readdir(p).catch(() => [])
      if (files.some(f => f.endsWith('.ts'))) serviceNames.push(ent)
    }
  }
  return Array.from(new Set(serviceNames)).sort()
}

async function detectFeathersPlugins(projectRoot: string) {
  const roots = [resolve(projectRoot, 'server/feathers'), resolve(projectRoot, 'feathers/server/plugins')]
  const found = new Set<string>()
  for (const root of roots) {
    if (!existsSync(root)) continue
    const entries = await readdir(root).catch(() => [])
    for (const ent of entries) {
      const p = join(root, ent)
      const st = await stat(p).catch(() => null)
      if (st?.isFile() && ent.endsWith('.ts')) found.add(ent)
    }
  }
  return Array.from(found).sort()
}


async function detectServerModules(projectRoot: string) {
  const roots = [resolve(projectRoot, 'server/feathers/modules'), resolve(projectRoot, 'server/feathers/modules')]
  const found = new Set<string>()
  for (const root of roots) {
    if (!existsSync(root)) continue
    const entries = await readdir(root).catch(() => [])
    for (const ent of entries) {
      const p = join(root, ent)
      const st = await stat(p).catch(() => null)
      if (st?.isFile() && ent.endsWith('.ts')) found.add(ent)
    }
  }
  return Array.from(found).sort()
}

async function detectMongoSignals(projectRoot: string, absServicesDirs: string[]) {
  const scanRoots = [
    ...absServicesDirs,
    resolve(projectRoot, 'feathers/server'),
  ].filter(p => existsSync(p))

  const candidates: string[] = []
  for (const root of scanRoots) {
    const q: string[] = [root]
    while (q.length) {
      const cur = q.pop()!
      const st = await stat(cur).catch(() => null)
      if (!st) continue
      if (st.isDirectory()) {
        const children = await readdir(cur).catch(() => [])
        for (const c of children) q.push(join(cur, c))
      }
      else if (st.isFile() && cur.endsWith('.ts')) {
        candidates.push(cur)
      }
    }
  }

  for (const f of candidates.slice(0, 800)) {
    const txt = await readFile(f, 'utf8').catch(() => '')
    if (txt.includes('mongodbClient') || txt.includes("app.get('mongodbClient')") || txt.includes('@feathersjs/mongodb')) {
      return true
    }
  }
  return false
}

export async function runDoctor(projectRoot: string) {
  const nuxtConfigPath = findNuxtConfigPath(projectRoot)
  consola.info('NFZ doctor')
  consola.info(`- projectRoot: ${projectRoot}`)
  consola.info(`- nuxt.config: ${nuxtConfigPath ? relativeToCwd(nuxtConfigPath) : '(not found)'}`)

  if (!nuxtConfigPath) {
    consola.warn('No nuxt.config found. Nothing to diagnose.')
    return
  }

  const cfg = await readFile(nuxtConfigPath, 'utf8')
  const hasModule = /\bmodules\s*:\s*\[[^\]]*[\\"\']nuxt-feathers-zod[\\"\']/.test(cfg) || /[\\"\']nuxt-feathers-zod[\\"\']/.test(cfg)
  consola.info(`- modules includes 'nuxt-feathers-zod': ${hasModule ? 'yes' : 'no'}`)

  const mode = parseMode(cfg)
  const restPath = parseRestPath(cfg)
  consola.info(`- feathers.client.mode: ${mode}`)
  consola.info(`- transports.rest.path: ${restPath}`)

  const templatesDirs = cfg.match(/templates\s*:\s*\{[\s\S]*?dirs\s*:\s*\[([^\]]*)\]/)?.[1]?.trim()
  if (templatesDirs) consola.info(`- feathers.templates.dirs: [${templatesDirs}]`)

  const moduleDirs = cfg.match(/moduleDirs\s*:\s*\[([^\]]*)\]/)?.[1]?.trim()
  if (moduleDirs) consola.info(`- feathers.server.moduleDirs: [${moduleDirs}]`)

  const absServicesDirs = parseServicesDirs(cfg, projectRoot, mode)
  if (absServicesDirs.length) consola.info(`- servicesDirs: ${absServicesDirs.map(relativeToCwd).join(', ')}`)

  if (mode === 'remote') {
    const remoteUrl = parseRemoteUrl(cfg)
    const remoteTransport = parseRemoteTransport(cfg) || 'socketio(?)'
    const websocketPath = parseWebsocketPath(cfg)
    const remoteAuth = parseRemoteAuth(cfg)
    const remoteServices = parseRemoteServices(cfg)
    const keycloak = parseKeycloak(cfg)

    consola.info(`- client.remote.url: ${remoteUrl || '(missing)'}`)
    consola.info(`- client.remote.transport: ${remoteTransport}`)
    consola.info(`- transports.websocket.path: ${websocketPath}`)
    consola.info(`- client.remote.auth.enabled: ${remoteAuth.enabled || 'false(?)'}`)
    if (remoteAuth.enabled === 'true') {
      consola.info(`- client.remote.auth.payloadMode: ${remoteAuth.payloadMode || '(missing)'}`)
      consola.info(`- client.remote.auth.strategy: ${remoteAuth.strategy || '(missing)'}`)
      consola.info(`- client.remote.auth.tokenField: ${remoteAuth.tokenField || '(missing)'}`)
      consola.info(`- client.remote.auth.servicePath: ${remoteAuth.servicePath || '(missing)'}`)
      consola.info(`- client.remote.auth.reauth: ${remoteAuth.reauth || '(missing)'}`)
    }
    consola.info(`- client.remote.services: ${remoteServices.length ? `${remoteServices.length} (${remoteServices.join(', ')})` : '0'}`)
    if (remoteAuth.payloadMode === 'keycloak' || keycloak.serverUrl || keycloak.realm || keycloak.clientId) {
      consola.info(`- feathers.keycloak.serverUrl: ${keycloak.serverUrl || '(missing)'}`)
      consola.info(`- feathers.keycloak.realm: ${keycloak.realm || '(missing)'}`)
      consola.info(`- feathers.keycloak.clientId: ${keycloak.clientId || '(missing)'}`)
    }

    consola.info('Checks:')
    const templatesDirDefault = resolve(projectRoot, 'feathers/templates')
    consola.info(`- ${relativeToCwd(templatesDirDefault)} exists: ${existsSync(templatesDirDefault) ? 'yes' : 'no'}`)
    const serverModulesDefault = resolve(projectRoot, 'server/feathers/modules')
    consola.info(`- ${relativeToCwd(serverModulesDefault)} exists: ${existsSync(serverModulesDefault) ? 'yes' : 'no'}`)

    const rec: string[] = []
    if (!hasModule) rec.push(`Add module to nuxt.config: modules: ['nuxt-feathers-zod']`)
    if (!remoteUrl) rec.push('Missing client.remote.url. Re-run: bunx nuxt-feathers-zod init remote --url https://api.example.tld')
    if (!['rest', 'socketio', 'auto'].includes(remoteTransport)) rec.push('Set a valid remote transport: --transport rest or --transport socketio')
    if (remoteTransport === 'rest' && !restPath) rec.push('REST transport needs transports.rest.path (default /feathers).')
    if (remoteTransport === 'socketio' && !websocketPath) rec.push('Socket.IO transport needs transports.websocket.path (default /socket.io).')
    if (remoteAuth.enabled === 'true' && !remoteAuth.payloadMode) rec.push('Remote auth is enabled but payloadMode is missing. Use --payloadMode jwt or --payloadMode keycloak.')
    if (remoteAuth.payloadMode === 'keycloak') {
      if (!keycloak.serverUrl || !keycloak.realm || !keycloak.clientId) rec.push('Keycloak payload mode requires feathers.keycloak.serverUrl, realm, and clientId. Run: bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example --realm myrealm --clientId myapp')
    }
    if (!remoteServices.length) rec.push('No remote services registered yet. Example: bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove')
    if (templatesDirs) rec.push('Note: in remote mode, template overrides are optional unless you customize generated client templates.')

    if (rec.length) {
      consola.info('Recommendations:')
      for (const r of rec) consola.info(`- ${r}`)
    }

    consola.info('Done.')
    return
  }

  consola.info('Checks:')
  const templatesDirDefault = resolve(projectRoot, 'feathers/templates')
  consola.info(`- ${relativeToCwd(templatesDirDefault)} exists: ${existsSync(templatesDirDefault) ? 'yes' : 'no'}`)
  const serverModulesDefault = resolve(projectRoot, 'server/feathers/modules')
  consola.info(`- ${relativeToCwd(serverModulesDefault)} exists: ${existsSync(serverModulesDefault) ? 'yes' : 'no'}`)

  const serviceNames = await detectEmbeddedServices(absServicesDirs)
  const pluginNames = await detectFeathersPlugins(projectRoot)
  const serverModuleNames = await detectServerModules(projectRoot)
  const likelyMongoAdapter = await detectMongoSignals(projectRoot, absServicesDirs)

  consola.info(`- embedded services detected: ${serviceNames.length ? `yes (${serviceNames.length}: ${serviceNames.join(', ')})` : 'no'}`)
  consola.info(`- server plugins detected: ${pluginNames.length ? `yes (${pluginNames.length}: ${pluginNames.join(', ')})` : 'no'}`)
  consola.info(`- server modules detected: ${serverModuleNames.length ? `yes (${serverModuleNames.length}: ${serverModuleNames.join(', ')})` : 'no'}`)
  consola.info(`- mongodb adapter signals detected: ${likelyMongoAdapter ? 'yes' : 'no'}`)

  const rec: string[] = []
  if (!hasModule) rec.push(`Add module to nuxt.config: modules: ['nuxt-feathers-zod']`)
  if (!serviceNames.length) {
    rec.push(`No embedded services found. Generate one: bunx nuxt-feathers-zod add service users`)
    rec.push(`Then test: GET http://localhost:3000${restPath}/users`)
  }
  if (!pluginNames.length) rec.push(`No Feathers server plugins detected. Add one if needed: bunx nuxt-feathers-zod add middleware my-plugin --target feathers`)
  if (!serverModuleNames.length) rec.push(`No server modules detected. Add one if needed: bunx nuxt-feathers-zod add middleware secure-headers --target server-module`)
  if (templatesDirs && !existsSync(templatesDirDefault)) rec.push(`Initialize template overrides: bunx nuxt-feathers-zod init templates`)
  if (likelyMongoAdapter) rec.push(`MongoDB detected: ensure you configure mongodbClient (server module) or generate services with --adapter memory`)

  if (rec.length) {
    consola.info('Recommendations:')
    for (const r of rec) consola.info(`- ${r}`)
  }

  consola.info('Done.')
}
