import type { Nuxt } from '@nuxt/schema'
import type { ResolvedOptions } from './runtime/options'

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { addCustomTab } from '@nuxt/devtools-kit'
import { addDevServerHandler } from '@nuxt/kit'
import { eventHandler, setHeader } from 'h3'

const DEVTOOLS_ROUTE = '/__nfz-devtools'
const DEVTOOLS_ROUTE_JSON = '/__nfz-devtools.json'
const DEVTOOLS_ROUTE_CSS = '/__nfz-devtools.css'

const VENDORED_STYLES = readFileSync(
  fileURLToPath(new URL('./runtime/devtools-ui-kit/assets/styles.css', import.meta.url)),
  'utf8',
)

export interface NfzDevtoolsPayload {
  mode: 'embedded' | 'remote'
  serverEnabled: boolean
  devtoolsEnabled: boolean
  restEnabled: boolean
  websocketEnabled: boolean
  restFramework: string
  authEnabled: boolean
  remoteAuthEnabled: boolean
  keycloakEnabled: boolean
  swaggerEnabled: boolean
  templatesStrict: boolean
  servicesDirsCount: number
  servicesDirs: string[]
  servicesDetected: Array<{ name: string, from: string }>
  remoteServices: Array<{ path: string, methods?: string[] }>
  diagnostics: string[]
  knownGoodScenarios: string[]
  runtimeConfigPublic: unknown
  authStrategies: string[]
  restPath: string | null
  websocketPath: string | null
  swaggerPath: string | null
}

function safeJson(value: unknown) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\u003c')
    .replace(/>/g, '\u003e')
}

function renderHtml(payload: NfzDevtoolsPayload) {
  const json = safeJson(payload)
  const jsonPayload = safeJson(payload)
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>NFZ DevTools</title>
    <link rel="stylesheet" href="${DEVTOOLS_ROUTE_CSS}">
    <style>
      :root {
        color-scheme: dark light;
        --nfz-bg: #0b1020;
        --nfz-bg-elevated: rgba(10,15,29,.9);
        --nfz-card: rgba(17,24,39,.72);
        --nfz-border: rgba(127,127,127,.22);
        --nfz-text: #e5e7eb;
        --nfz-muted: #a1a1aa;
        --nfz-ok: #86efac;
        --nfz-warn: #fcd34d;
        --nfz-accent: #60a5fa;
      }
      html, body { margin: 0; padding: 0; background: var(--nfz-bg); color: var(--nfz-text); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { min-height: 100vh; }
      .nfz-shell { max-width: 1400px; margin: 0 auto; padding: 18px; display: grid; gap: 14px; }
      .nfz-navbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--nfz-border); background: var(--nfz-bg-elevated); padding: 14px 16px; border-radius: 16px; backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 20; }
      .nfz-brand { display: grid; gap: 2px; }
      .nfz-title { font-size: 18px; font-weight: 700; }
      .nfz-sub { font-size: 12px; color: var(--nfz-muted); }
      .nfz-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .nfz-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
      .nfz-tab { appearance: none; border: 1px solid var(--nfz-border); background: rgba(255,255,255,.04); color: var(--nfz-text); border-radius: 999px; padding: 8px 12px; cursor: pointer; font-size: 12px; }
      .nfz-tab.active { background: rgba(96,165,250,.18); border-color: rgba(96,165,250,.4); }
      .nfz-input { border: 1px solid var(--nfz-border); background: rgba(255,255,255,.04); color: var(--nfz-text); border-radius: 10px; padding: 9px 12px; min-width: 240px; }
      .nfz-btn { appearance: none; border: 1px solid var(--nfz-border); background: rgba(255,255,255,.04); color: var(--nfz-text); border-radius: 10px; padding: 9px 12px; cursor: pointer; }
      .nfz-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .nfz-card { border: 1px solid var(--nfz-border); border-radius: 16px; padding: 14px; background: var(--nfz-card); }
      .nfz-card h2, .nfz-card h3, .nfz-card p { margin: 0; }
      .nfz-card h2 { font-size: 14px; margin-bottom: 10px; }
      .nfz-kpi { display: flex; gap: 8px; flex-wrap: wrap; }
      .nfz-pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; border: 1px solid rgba(96,165,250,.28); background: rgba(96,165,250,.14); padding: 4px 10px; font-size: 12px; }
      .nfz-pill.ok { border-color: rgba(134,239,172,.25); background: rgba(134,239,172,.12); color: var(--nfz-ok); }
      .nfz-pill.warn { border-color: rgba(252,211,77,.25); background: rgba(252,211,77,.12); color: var(--nfz-warn); }
      .nfz-section { display: none; gap: 12px; }
      .nfz-section.active { display: grid; }
      .nfz-list { display: grid; gap: 8px; }
      .nfz-item { border: 1px solid var(--nfz-border); border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,.03); }
      .nfz-item .path { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; }
      .nfz-item .meta { color: var(--nfz-muted); font-size: 12px; margin-top: 4px; }
      .nfz-split { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(360px, 1.1fr); gap: 12px; }
      .nfz-pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 12px; line-height: 1.45; font-family: ui-monospace, SFMono-Regular, monospace; }
      .nfz-help ul { margin: 8px 0 0 18px; padding: 0; }
      .nfz-help li { margin: 6px 0; }
      .nfz-muted { color: var(--nfz-muted); }
      @media (max-width: 980px) { .nfz-split { grid-template-columns: 1fr; } .nfz-navbar { position: static; } }
      html.light { --nfz-bg: #f6f7fb; --nfz-bg-elevated: rgba(255,255,255,.96); --nfz-card: rgba(255,255,255,.92); --nfz-border: rgba(31,41,55,.12); --nfz-text: #0f172a; --nfz-muted: #475569; }
      html.dark { --nfz-bg: #0b1020; --nfz-bg-elevated: rgba(10,15,29,.9); --nfz-card: rgba(17,24,39,.72); --nfz-border: rgba(127,127,127,.22); --nfz-text: #e5e7eb; --nfz-muted: #a1a1aa; }
      html.parent-theme-synced .nfz-sub::after { content: ' · synced with parent theme'; }
    </style>
  </head>
  <body>
    <div class="nfz-shell">
      <div class="nfz-navbar">
        <div class="nfz-brand">
          <div class="nfz-title">nuxt-feathers-zod</div>
          <div class="nfz-sub">NFZ DevTools · OSS stabilization cockpit · devtools-ui-kit enriched</div>
        </div>
        <div class="nfz-actions">
          <div class="nfz-tabs">
            <button class="nfz-tab active" data-tab="overview">Overview</button>
            <button class="nfz-tab" data-tab="services">Services</button>
            <button class="nfz-tab" data-tab="runtime">Runtime</button>
            <button class="nfz-tab" data-tab="help">Help</button>
          </div>
          <input id="nfz-search" class="nfz-input" type="search" placeholder="Filter diagnostics or services">
          <button id="nfz-theme" class="nfz-btn" title="Re-sync theme from parent DevTools shell">Sync parent theme</button>
        </div>
      </div>

      <section id="tab-overview" class="nfz-section active">
        <div class="nfz-grid">
          <div class="nfz-card"><h2>Mode</h2><div class="nfz-kpi"><span class="nfz-pill">${payload.mode}</span><span class="nfz-pill ${payload.serverEnabled ? 'ok' : 'warn'}">server:${payload.serverEnabled}</span><span class="nfz-pill">devtools:${payload.devtoolsEnabled}</span></div></div>
          <div class="nfz-card"><h2>Transports</h2><div class="nfz-kpi"><span class="nfz-pill ${payload.restEnabled ? 'ok' : 'warn'}">rest:${payload.restEnabled}</span><span class="nfz-pill ${payload.websocketEnabled ? 'ok' : 'warn'}">ws:${payload.websocketEnabled}</span><span class="nfz-pill">framework:${payload.restFramework}</span></div></div>
          <div class="nfz-card"><h2>Auth</h2><div class="nfz-kpi"><span class="nfz-pill ${payload.authEnabled ? 'ok' : 'warn'}">embedded:${payload.authEnabled}</span><span class="nfz-pill ${payload.remoteAuthEnabled ? 'ok' : 'warn'}">remote:${payload.remoteAuthEnabled}</span><span class="nfz-pill ${payload.keycloakEnabled ? 'ok' : 'warn'}">keycloak:${payload.keycloakEnabled}</span></div></div>
          <div class="nfz-card"><h2>Surface</h2><div class="nfz-kpi"><span class="nfz-pill ${payload.swaggerEnabled ? 'ok' : 'warn'}">swagger:${payload.swaggerEnabled}</span><span class="nfz-pill">templatesStrict:${payload.templatesStrict}</span><span class="nfz-pill">servicesDirs:${payload.servicesDirsCount}</span></div></div>
        </div>
        <div class="nfz-split">
          <div class="nfz-card">
            <h2>Diagnostics</h2>
            <div id="nfz-diagnostics" class="nfz-list"></div>
          </div>
          <div class="nfz-card">
            <h2>Known-good scenarios</h2>
            <div id="nfz-scenarios" class="nfz-list"></div>
          </div>
        </div>
      </section>

      <section id="tab-services" class="nfz-section">
        <div class="nfz-split">
          <div class="nfz-card"><h2>Detected local services</h2><div id="nfz-local-services" class="nfz-list"></div></div>
          <div class="nfz-card"><h2>Declared remote services</h2><div id="nfz-remote-services" class="nfz-list"></div></div>
        </div>
        <div class="nfz-card"><h2>Services directories</h2><pre class="nfz-pre">${safeJson(payload.servicesDirs)}</pre></div>
      </section>

      <section id="tab-runtime" class="nfz-section">
        <div class="nfz-grid">
          <div class="nfz-card"><h2>Auth strategies</h2><div id="nfz-auth-strategies" class="nfz-kpi"></div></div>
          <div class="nfz-card"><h2>Endpoints</h2><div class="nfz-kpi"><span class="nfz-pill">rest:${payload.restPath ?? 'n/a'}</span><span class="nfz-pill">ws:${payload.websocketPath ?? 'n/a'}</span><span class="nfz-pill">swagger:${payload.swaggerPath ?? 'n/a'}</span></div></div>
        </div>
        <div class="nfz-card"><h2>Resolved payload</h2><pre class="nfz-pre">${json}</pre></div>
      </section>

      <section id="tab-help" class="nfz-section nfz-help">
        <div class="nfz-grid">
          <div class="nfz-card"><h2>Embedded checks</h2><ul><li>Verify <code>servicesDirs</code> points to generated Feathers services.</li><li>With local auth enabled, make sure a <code>users</code> service exists and exports shared/schema files.</li><li>When REST is enabled, confirm the selected framework matches the expected server modules.</li></ul></div>
          <div class="nfz-card"><h2>Remote checks</h2><ul><li>Set <code>client.mode = 'remote'</code> and declare <code>client.remote.services</code>.</li><li>In remote mode, treat <code>client.remote.transport</code> as the source of truth; <code>feathers.transports</code> is embedded/server-only.</li><li>Keep <code>server.enabled = false</code> unless you intentionally combine remote mode with embedded APIs.</li><li>For JWT or Keycloak, confirm the expected <code>payloadMode</code>, token field, and service path.</li><li>When <code>transport = 'auto'</code> (or omitted), NFZ currently resolves to <code>socketio</code> in remote mode. Prefer <code>rest</code> explicitly for first-pass network diagnostics.</li></ul></div>
          <div class="nfz-card"><h2>Vendored devtools-ui-kit</h2><ul><li>Integrated source subset under <code>src/runtime/devtools-ui-kit</code>.</li><li>Current NFZ tab keeps an iframe architecture but now consumes vendored styles and aligns with future Vue-based tabs.</li><li>The kit subset is ready for a future move toward a richer client-side DevTools app.</li></ul></div>
        </div>
      </section>
    </div>
    <script type="application/json" id="nfz-payload">${jsonPayload}</script>
    <script>
      const payload = JSON.parse(document.getElementById('nfz-payload').textContent || '{}')
      const diagnosticsEl = document.getElementById('nfz-diagnostics')
      const scenariosEl = document.getElementById('nfz-scenarios')
      const localEl = document.getElementById('nfz-local-services')
      const remoteEl = document.getElementById('nfz-remote-services')
      const authStrategiesEl = document.getElementById('nfz-auth-strategies')
      const searchEl = document.getElementById('nfz-search')
      const tabs = Array.from(document.querySelectorAll('.nfz-tab'))
      const sections = Array.from(document.querySelectorAll('.nfz-section'))
      const themeBtn = document.getElementById('nfz-theme')

      function renderItems(target, items, mapper) {
        target.innerHTML = items.length ? items.map(mapper).join('') : '<div class="nfz-item nfz-muted">None</div>'
      }

      renderItems(diagnosticsEl, payload.diagnostics || [], (item) => '<div class="nfz-item" data-search="' + String(item).toLowerCase() + '"><div class="path">' + item + '</div></div>')
      renderItems(scenariosEl, payload.knownGoodScenarios || [], (item) => '<div class="nfz-item" data-search="' + String(item).toLowerCase() + '"><div class="path">' + item + '</div></div>')
      renderItems(localEl, payload.servicesDetected || [], (item) => '<div class="nfz-item" data-search="' + (String(item.name) + ' ' + String(item.from)).toLowerCase() + '"><div class="path">' + item.name + '</div><div class="meta">' + item.from + '</div></div>')
      renderItems(remoteEl, payload.remoteServices || [], (item) => '<div class="nfz-item" data-search="' + (String(item.path) + ' ' + String((item.methods || []).join(' '))).toLowerCase() + '"><div class="path">' + item.path + '</div><div class="meta">' + ((item.methods || []).length ? item.methods.join(', ') : 'methods inherited') + '</div></div>')
      ;(payload.authStrategies || []).forEach((item) => {
        const el = document.createElement('span')
        el.className = 'nfz-pill'
        el.textContent = item
        authStrategiesEl.appendChild(el)
      })
      if (!(payload.authStrategies || []).length) {
        authStrategiesEl.innerHTML = '<span class="nfz-muted">No auth strategies resolved</span>'
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const name = tab.dataset.tab
          tabs.forEach(t => t.classList.toggle('active', t === tab))
          sections.forEach(section => section.classList.toggle('active', section.id === 'tab-' + name))
        })
      })

      searchEl.addEventListener('input', () => {
        const needle = String(searchEl.value || '').trim().toLowerCase()
        document.querySelectorAll('[data-search]').forEach((el) => {
          const hay = el.getAttribute('data-search') || ''
          el.style.display = !needle || hay.includes(needle) ? '' : 'none'
        })
      })

      const docEl = document.documentElement
      const rootThemeAttrs = ['class', 'data-theme', 'style']

      function getParentThemeState() {
        try {
          const parentEl = window.parent?.document?.documentElement
          if (!parentEl)
            return null
          const className = String(parentEl.className || '')
          const dataTheme = String(parentEl.getAttribute('data-theme') || '')
          const computed = window.parent.getComputedStyle(parentEl)
          const colorScheme = String(computed.colorScheme || '')
          const isDark = /(^|\s)dark(\s|$)/.test(className)
            || dataTheme === 'dark'
            || colorScheme.includes('dark')
          return { isDark, className, dataTheme }
        }
        catch {
          return null
        }
      }

      function applyTheme(theme) {
        docEl.classList.remove('dark', 'light')
        docEl.classList.add(theme)
      }

      function syncThemeFromParent() {
        const parentTheme = getParentThemeState()
        if (parentTheme) {
          applyTheme(parentTheme.isDark ? 'dark' : 'light')
          docEl.classList.add('parent-theme-synced')
          return true
        }
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        applyTheme(prefersDark ? 'dark' : 'light')
        docEl.classList.remove('parent-theme-synced')
        return false
      }

      syncThemeFromParent()

      let parentObserver = null
      try {
        const parentEl = window.parent?.document?.documentElement
        if (parentEl && window.parent !== window) {
          parentObserver = new window.MutationObserver(() => syncThemeFromParent())
          parentObserver.observe(parentEl, { attributes: true, attributeFilter: rootThemeAttrs })
        }
      }
      catch {}

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        syncThemeFromParent()
      })

      themeBtn.addEventListener('click', () => {
        syncThemeFromParent()
      })
    </script>
  </body>
</html>`
}

function buildDiagnostics(options: ResolvedOptions, payload: Omit<NfzDevtoolsPayload, 'diagnostics' | 'knownGoodScenarios'>) {
  const diagnostics: string[] = []
  if (payload.mode === 'embedded') {
    diagnostics.push(payload.serverEnabled
      ? 'OK: embedded mode keeps the server enabled'
      : 'WARN: embedded mode with server disabled is unusual and should be tested explicitly')
    diagnostics.push(payload.servicesDetected.length > 0
      ? `OK: detected ${payload.servicesDetected.length} local service schema export(s)`
      : 'WARN: embedded mode has no detected local service schema exports')
    if (payload.authEnabled && payload.servicesDetected.length === 0)
      diagnostics.push('WARN: auth is enabled but no local services were detected; verify servicesDirs and generated schemas')
  }
  else {
    diagnostics.push(payload.serverEnabled
      ? 'WARN: remote mode with server enabled is an advanced override; verify that it is intentional'
      : 'OK: remote mode disables the embedded server by default')
    diagnostics.push(payload.remoteServices.length > 0
      ? `OK: remote mode declares ${payload.remoteServices.length} service(s)`
      : 'WARN: remote mode has no declared services; verify client.remote.services')
    diagnostics.push(payload.remoteAuthEnabled
      ? 'OK: remote auth is enabled'
      : 'WARN: remote auth is disabled; verify that the target API is intentionally public or anonymous')
    if (payload.websocketEnabled)
      diagnostics.push('INFO: in remote mode, client.remote.transport is the source of truth; feathers.transports applies only to embedded/server runtime')
  }

  if (payload.restEnabled && payload.restFramework === 'koa')
    diagnostics.push('OK: Koa server modules should be selected for embedded REST')
  if (payload.restEnabled && payload.restFramework === 'express')
    diagnostics.push('OK: Express server modules should be selected for embedded REST')
  if (options.swagger)
    diagnostics.push('OK: swagger is enabled')
  if (options.keycloak)
    diagnostics.push('OK: keycloak support is enabled')

  return diagnostics
}

export function setupNfzDevtools(nuxt: Nuxt, options: ResolvedOptions, extras?: { servicesDetected?: Array<{ name: string, from: string }> }) {
  const clientOptions = options.client && typeof options.client === 'object' ? options.client : false
  const clientMode = clientOptions ? clientOptions.mode : 'embedded'
  const remoteOptions = clientOptions && clientOptions.mode === 'remote' ? clientOptions.remote : undefined

  const payloadBase = {
    mode: clientMode,
    serverEnabled: Boolean((options.server as any)?.enabled ?? (clientMode !== 'remote')),
    devtoolsEnabled: options.devtools !== false,
    restEnabled: Boolean(options.transports?.rest),
    websocketEnabled: Boolean(options.transports?.websocket),
    restFramework: options.transports?.rest && typeof options.transports.rest === 'object' ? options.transports.rest.framework : 'express',
    authEnabled: Boolean(options.auth),
    remoteAuthEnabled: Boolean(remoteOptions?.auth?.enabled),
    keycloakEnabled: Boolean(options.keycloak),
    swaggerEnabled: Boolean(options.swagger),
    templatesStrict: options.templates?.strict !== false,
    servicesDirsCount: Array.isArray(options.servicesDirs) ? options.servicesDirs.length : 0,
    servicesDirs: options.servicesDirs,
    servicesDetected: extras?.servicesDetected ?? [],
    remoteServices: remoteOptions?.services ?? [],
    runtimeConfigPublic: nuxt.options.runtimeConfig.public?._feathers ?? null,
    authStrategies: Array.isArray((options.auth as any)?.authStrategies) ? (options.auth as any).authStrategies : [],
    restPath: options.transports?.rest && typeof options.transports.rest === 'object' ? options.transports.rest.path : null,
    websocketPath: options.transports?.websocket && typeof options.transports.websocket === 'object' ? options.transports.websocket.path : null,
    swaggerPath: options.swagger && typeof options.swagger === 'object' ? options.swagger.docsPath : (options.swagger ? '/feathers/docs' : null),
  }

  const payload: NfzDevtoolsPayload = {
    ...payloadBase,
    diagnostics: buildDiagnostics(options, payloadBase),
    knownGoodScenarios: [
      'embedded + express + local auth',
      'embedded + express + mongodb',
      'embedded + koa + no auth',
      'remote + rest',
      'remote + socketio + jwt',
      'remote + socketio + keycloak',
    ],
  }

  addDevServerHandler({
    route: DEVTOOLS_ROUTE_CSS,
    handler: eventHandler((event) => {
      setHeader(event, 'content-type', 'text/css; charset=utf-8')
      return VENDORED_STYLES
    }),
  })

  addDevServerHandler({
    route: DEVTOOLS_ROUTE_JSON,
    handler: eventHandler((event) => {
      setHeader(event, 'content-type', 'application/json; charset=utf-8')
      return payload
    }),
  })

  addDevServerHandler({
    route: DEVTOOLS_ROUTE,
    handler: eventHandler((event) => {
      setHeader(event, 'content-type', 'text/html; charset=utf-8')
      return renderHtml(payload)
    }),
  })

  addCustomTab({
    name: 'nfz-oss',
    title: 'NFZ',
    icon: 'carbon:data-base',
    view: {
      type: 'iframe',
      src: DEVTOOLS_ROUTE,
    },
  }, nuxt)
}
