import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const problems = []

function read(path) {
  return readFileSync(resolve(rootDir, path), 'utf8')
}

function requireText(path, needle, label = needle) {
  if (!read(path).includes(needle))
    problems.push(`${path}: missing ${label}`)
}

function forbid(path, pattern, label = String(pattern)) {
  if (pattern.test(read(path)))
    problems.push(`${path}: forbidden ${label}`)
}

requireText('src/runtime/templates/server/authentication.ts', "from 'nuxt-feathers-zod/server-auth'", 'secured server-auth runtime import')
requireText('src/runtime/templates/server/plugin.ts', 'strategies: parseStrategies || []', 'provider-aware transport parsing')
requireText('src/runtime/auth/registry.ts', 'NfzAuthenticationProviderRegistry', 'authentication provider registry')
requireText('src/runtime/auth/registry.ts', 'parseStrategies:', 'dynamic provider parse-strategy registration')
requireText('src/runtime/options/authentication/index.ts', 'ensureJwtVerificationProvider', 'automatic JWT verification provider for NFZ-issued tokens')
requireText('src/runtime/auth/security.ts', 'ephemeral-development', 'ephemeral development key policy')
requireText('src/runtime/auth/security.ts', 'Refusing to start embedded authentication in production', 'production fail-closed policy')
requireText('src/runtime/auth/security.ts', 'createPrivateKey', 'asymmetric private-key validation')
requireText('src/runtime/auth/security.ts', 'public key does not match the private key', 'asymmetric key-pair matching')
requireText('src/runtime/auth/security.ts', 'at least 2048 bits', 'minimum RSA key strength')
requireText('src/runtime/auth/service.ts', 'algorithm: this.nfzKeys.algorithm', 'strict JWT verification algorithm selection')
requireText('src/runtime/auth/service.ts', 'algorithms: _ignoredAlgorithms', 'caller JWT verification allowlist stripping')
forbid('src/runtime/auth/service.ts', /algorithms:\s*\[this\.nfzKeys\.algorithm\]/, 'conflicting Feathers/jsonwebtoken algorithm options')
requireText('src/runtime/auth/registry.ts', 'algorithms: _ignoredJwtAlgorithms', 'unsafe configured JWT allowlist stripping')
requireText('src/runtime/auth/principal.ts', 'export interface NfzPrincipal', 'normalized principal contract')
requireText('src/runtime/auth/strategies/oidc.ts', 'createRemoteJWKSet', 'OIDC JWKS verification')
requireText('src/runtime/auth/strategies/oidc.ts', 'audienceMatches', 'OIDC audience routing check')
requireText('src/runtime/auth/strategies/oidc.ts', 'failOpen is forbidden in production', 'OIDC production mapping guard')
requireText('src/runtime/auth/strategies/api-key.ts', 'timingSafeEqual', 'constant-time API key comparison')
requireText('src/cli/core.ts', 'authenticateNfz()', 'provider-aware generated service hook')
requireText('test/cli.spec.ts', "expect(svc).toContain('authenticateNfz()')", 'provider-aware generator regression assertion')
requireText('src/runtime/server/mongodb.ts', 'authenticateNfz(', 'provider-aware MongoDB management authentication')
requireText('src/runtime/server/console-services.ts', 'authenticateNfz(', 'provider-aware NFZ console authentication')
requireText('examples/nfz-quasar-unocss-pinia-starter/services/messages/messages.ts', 'authenticateNfz()', 'provider-aware starter services')
requireText('package.json', '"./server-auth"', 'server-auth package export')
requireText('package.json', '"./auth"', 'auth package export')

forbid('src/runtime/options/authentication/index.ts', /digest\s*\(\s*appDir\s*\)/, 'deterministic project-path authentication secret')
forbid('src/runtime/options/authentication/index.ts', /change-me-in-production/i, 'demo authentication secret')
forbid('src/runtime/options/index.ts', /providers:\s*options\.auth\.providers/, 'private provider configuration copied into public runtime config')
forbid('src/runtime/options/index.ts', /keys:\s*options\.auth\.keys/, 'private JWT keys copied into public runtime config')
forbid('src/runtime/options/index.ts', /secret:\s*options\.auth\.secret/, 'private JWT secret copied into public runtime config')
forbid('src/runtime/server/mongodb.ts', /authenticate\(['"]jwt['"]\)/, 'MongoDB management hard-coded to JWT')
forbid('src/runtime/server/console-services.ts', /authenticate\(['"]jwt['"]\)/, 'NFZ console hard-coded to JWT')
forbid('examples/nfz-quasar-unocss-pinia-starter/services/messages/messages.ts', /authenticate\(['"]jwt['"]\)/, 'starter message service hard-coded to JWT')
forbid('examples/nfz-quasar-unocss-pinia-starter/services/users/users.ts', /authenticate\(['"]jwt['"]\)/, 'starter user service hard-coded to JWT')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Authentication security foundation check failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Authentication provider registry and security foundation checks passed.')
