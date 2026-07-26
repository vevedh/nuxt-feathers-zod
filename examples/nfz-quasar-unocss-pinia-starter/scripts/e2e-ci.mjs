import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { assertStarterRuntimeProcessHealthy } from './runtime-evidence.mjs'
import { resolveMountedRoutePath } from './runtime-paths.mjs'

const root = resolve(import.meta.dirname, '..')
const host = '127.0.0.1'
const port = Number(process.env.NFZ_E2E_PORT || 43127)
const baseUrl = `http://${host}:${port}`
const userId = process.env.NFZ_DEMO_USER || 'admin'
const password = process.env.NFZ_DEMO_PASSWORD || 'NfzStarter-Ci-2026!'
const authSecret = randomBytes(48).toString('base64url')
const restMountPath = process.env.NFZ_E2E_REST_PATH || '/feathers'
const configuredHealthPath = process.env.NFZ_E2E_HEALTH_PATH || '/api/health'
const healthPath = resolveMountedRoutePath(restMountPath, configuredHealthPath)
let output = ''
let child

function assert(condition, message) {
  if (!condition)
    throw new Error(message)
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init)
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  return { response, body, contentType }
}

async function waitForServer() {
  let lastError
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const result = await request(healthPath)
      if (result.response.ok)
        return
      lastError = new Error(`health returned ${result.response.status}`)
    }
    catch (error) {
      lastError = error
    }
    assertStarterRuntimeProcessHealthy({
      output,
      exitCode: child.exitCode,
      signalCode: child.signalCode,
    })
    await delay(500)
  }
  throw lastError || new Error('Starter production server did not become ready.')
}

child = spawn(process.execPath, ['.output/server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    HOST: host,
    PORT: String(port),
    NODE_ENV: 'production',
    NFZ_DEMO_ENABLED: 'true',
    NFZ_DEMO_USER: userId,
    NFZ_DEMO_PASSWORD: password,
    NFZ_AUTH_SECRET: authSecret,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

child.stdout.on('data', (chunk) => { output += String(chunk) })
child.stderr.on('data', (chunk) => { output += String(chunk) })

try {
  await waitForServer()

  const health = await request(healthPath)
  assert(health.response.status === 200, `${healthPath} returned ${health.response.status}`)
  assert(health.contentType.includes('application/json'), `${healthPath} did not return JSON`)

  const authentication = await request('/feathers/authentication', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ strategy: 'local', userId, password }),
  })
  assert(authentication.response.ok, `authentication returned ${authentication.response.status}: ${JSON.stringify(authentication.body)}`)
  const accessToken = authentication.body?.accessToken
  assert(typeof accessToken === 'string' && accessToken.length > 20, 'authentication did not return an access token')
  const headers = { 'content-type': 'application/json', 'authorization': `Bearer ${accessToken}` }

  const found = await request('/feathers/messages?$limit=1', { headers })
  assert(found.response.ok, `GET /feathers/messages returned ${found.response.status}`)
  assert(found.contentType.includes('application/json'), 'GET /feathers/messages returned Nuxt HTML instead of Feathers JSON')

  const created = await request('/feathers/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: 'NFZ production REST bridge validation' }),
  })
  assert([200, 201].includes(created.response.status), `POST /feathers/messages returned ${created.response.status}`)
  const id = created.body?.id ?? created.body?._id
  assert(id !== undefined && id !== null, 'created message has no id')

  const patched = await request(`/feathers/messages/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ text: 'NFZ production REST bridge validated' }),
  })
  assert(patched.response.ok, `PATCH /feathers/messages/:id returned ${patched.response.status}`)

  const removed = await request(`/feathers/messages/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers,
  })
  assert(removed.response.ok, `DELETE /feathers/messages/:id returned ${removed.response.status}`)

  const dashboard = await request('/dashboard')
  assert(dashboard.response.ok || [302, 307].includes(dashboard.response.status), `/dashboard returned ${dashboard.response.status}`)
  assert(!dashboard.contentType.includes('application/json') || dashboard.response.redirected, '/dashboard did not return or redirect to the application page')

  assertStarterRuntimeProcessHealthy({
    output,
    exitCode: child.exitCode,
    signalCode: child.signalCode,
  })

  console.log(`[starter-e2e] production health ${healthPath}, dashboard and Feathers REST CRUD passed.`)
}
catch (error) {
  console.error(output.slice(-12000))
  throw error
}
finally {
  child.kill('SIGTERM')
  await Promise.race([
    new Promise(resolveExit => child.once('exit', resolveExit)),
    delay(3000).then(() => child.kill('SIGKILL')),
  ])
}
