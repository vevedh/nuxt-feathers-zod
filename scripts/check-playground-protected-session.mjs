import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), 'utf8')
}

function requireText(source, needle, label) {
  if (!source.includes(needle))
    throw new Error(`[playground-auth] Missing ${label}: ${needle}`)
}

const messagesService = read('services/messages/messages.ts')
const authMiddleware = read('playground/app/middleware/auth.ts')
const globalSessionMiddleware = read('playground/app/middleware/session.global.ts')
const messagesPage = read('playground/app/pages/messages.vue')
const playwright = read('test/playwright/playground-functional.spec.ts')

requireText(messagesService, "import { authenticateNfz } from 'nuxt-feathers-zod/server-auth'", 'provider-aware auth import on messages service')
requireText(messagesService, 'authenticateNfz(),', 'external messages protection')

requireText(authMiddleware, 'if (auth.isAuthenticated.value)', 'authenticated route short-circuit')
requireText(authMiddleware, "const target = auth.provider.value === 'remote' ? '/tests' : '/'", 'anonymous local/remote redirect')
requireText(authMiddleware, "auth: 'required'", 'protected-route redirect diagnostic')
requireText(globalSessionMiddleware, 'await auth.reAuthenticate().catch', 'soft existing-session restoration')
if (globalSessionMiddleware.includes('navigateTo('))
  throw new Error('[playground-auth] Global playground session restoration must never redirect public diagnostics.')

requireText(messagesPage, 'const logoutBusy = ref(false)', 'logout double-submit protection')
requireText(messagesPage, "? { redirectUri: window.location.origin + '/' }", 'Keycloak logout redirect')
requireText(messagesPage, "await navigateTo('/')", 'local logout navigation')
requireText(messagesPage, "messages.value = { total: 0, data: [] }", 'post-logout protected data cleanup')

requireText(playwright, 'closes the local session and blocks the protected messages route', 'browser logout regression')
requireText(playwright, "expect(anonymousResponse.status()).toBe(401)", 'anonymous service rejection assertion')
requireText(playwright, "window.localStorage.getItem('feathers-jwt')", 'logout token cleanup assertion')
requireText(playwright, "getByRole('button', { name: 'Se connecter' })", 'anonymous local-session readiness assertion')
requireText(playwright, "url.searchParams.get('redirect') === '/messages'", 'anonymous route redirect assertion')

console.log('[nuxt-feathers-zod] Playground protected-session contract is aligned: global restoration stays non-blocking, messages require auth, logout clears client tokens and leaves the protected route, and Playwright covers anonymous rejection.')
