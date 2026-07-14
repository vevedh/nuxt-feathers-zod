import type { Application } from './declarations'

import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'

import { SsoLdapStrategy } from './authentication/strategies/sso-ldap.strategy'

export function authentication(app: Application): void {
  const authService = new AuthenticationService(app)

  authService.register('jwt', new JWTStrategy())
  authService.register('local', new LocalStrategy())
  authService.register('keycloak-ldap', new SsoLdapStrategy())

  app.use('authentication', authService)
}
