import type { JWTPayload } from 'jose'

import { AuthenticationBaseStrategy } from '@feathersjs/authentication'
import { NotAuthenticated } from '@feathersjs/errors'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { Client } from 'ldapts'

interface SsoAuthenticationPayload {
  strategy: 'keycloak-ldap'
  access_token?: string
  accessToken?: string
  token?: string
  username?: string
}

interface LdapUser {
  dn: string
  username: string
  email?: string
  displayName?: string
  givenName?: string
  sn?: string
  department?: string
  title?: string
  memberOf: string[]
}

interface AppUser {
  id: string
  keycloakId: string
  username: string
  email?: string
  displayName?: string
  department?: string
  title?: string
  roles: string[]
  groups: string[]
  ldap: LdapUser
  sso: {
    provider: 'keycloak'
    subject: string
    preferredUsername?: string
    realmRoles: string[]
    clientRoles: string[]
  }
}

function getStringClaim(payload: JWTPayload, key: string): string | undefined {
  const value = payload[key]
  return typeof value === 'string' ? value : undefined
}

function getRealmRoles(payload: JWTPayload): string[] {
  const realmAccess = payload.realm_access as { roles?: unknown } | undefined
  return Array.isArray(realmAccess?.roles)
    ? realmAccess.roles.filter((role): role is string => typeof role === 'string')
    : []
}

function getClientRoles(payload: JWTPayload, clientId: string): string[] {
  const resourceAccess = payload.resource_access as Record<string, { roles?: unknown }> | undefined
  const roles = resourceAccess?.[clientId]?.roles
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === 'string')
    : []
}

function escapeLdapFilter(value: string): string {
  return value.replace(/[\\*()[\]\0]/g, char => `\\${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

function getPreferredUsername(payload: JWTPayload): string | undefined {
  return [
    getStringClaim(payload, 'preferred_username'),
    getStringClaim(payload, 'email'),
    getStringClaim(payload, 'upn'),
  ].find(Boolean)
}

function getMemberOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String)
  }

  if (value) {
    return [String(value)]
  }

  return []
}

export class SsoLdapStrategy extends AuthenticationBaseStrategy {
  readonly name = 'keycloak-ldap'

  private get issuer(): string {
    const serverUrl = this.app.get('keycloakServerUrl') as string
    const realm = this.app.get('keycloakRealm') as string
    return `${serverUrl.replace(/\/$/, '')}/realms/${realm}`
  }

  private get clientId(): string {
    return this.app.get('keycloakClientId') as string
  }

  private get jwks() {
    return createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`))
  }

  async authenticate(authentication: SsoAuthenticationPayload): Promise<Record<string, unknown>> {
    const token = authentication.access_token || authentication.accessToken || authentication.token

    if (!token) {
      throw new NotAuthenticated('Missing Keycloak token')
    }

    const payload = await this.verifyKeycloakToken(token)
    const usernameFromToken = getPreferredUsername(payload)

    if (!usernameFromToken) {
      throw new NotAuthenticated('No usable username claim found in Keycloak token')
    }

    const safeUsername = normalizeUsername(usernameFromToken)

    if (authentication.username && normalizeUsername(authentication.username) !== safeUsername) {
      throw new NotAuthenticated('Frontend username does not match the Keycloak token')
    }

    const ldapUser = await this.findLdapUser(safeUsername)
    if (!ldapUser) {
      throw new NotAuthenticated(`LDAP user not found: ${safeUsername}`)
    }

    return {
      authentication: {
        strategy: this.name,
        provider: 'keycloak',
        subject: payload.sub,
        username: safeUsername,
      },
      user: this.mapLdapUserToAppUser(payload, ldapUser),
    }
  }

  private async verifyKeycloakToken(token: string): Promise<JWTPayload> {
    const result = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.clientId,
    })

    if (!result.payload.sub) {
      throw new NotAuthenticated('Invalid Keycloak token: missing sub')
    }

    return result.payload
  }

  private async findLdapUser(username: string): Promise<LdapUser | null> {
    const client = new Client({ url: this.app.get('ldapUrl') as string })

    try {
      await client.bind(this.app.get('ldapBindDn') as string, this.app.get('ldapBindPassword') as string)

      const escapedUsername = escapeLdapFilter(username)
      const filter = [
        '(&',
        '(objectClass=user)',
        '(|',
        `(sAMAccountName=${escapedUsername})`,
        `(userPrincipalName=${escapedUsername})`,
        `(mail=${escapedUsername})`,
        ')',
        ')',
      ].join('')

      const result = await client.search(this.app.get('ldapBaseDn') as string, {
        scope: 'sub',
        filter,
        attributes: [
          'dn',
          'sAMAccountName',
          'userPrincipalName',
          'mail',
          'displayName',
          'givenName',
          'sn',
          'department',
          'title',
          'memberOf',
        ],
      })

      const entry = result.searchEntries[0]
      if (!entry) {
        return null
      }

      return {
        dn: String(entry.dn),
        username: String(entry.sAMAccountName || entry.userPrincipalName || username),
        email: entry.mail ? String(entry.mail) : undefined,
        displayName: entry.displayName ? String(entry.displayName) : undefined,
        givenName: entry.givenName ? String(entry.givenName) : undefined,
        sn: entry.sn ? String(entry.sn) : undefined,
        department: entry.department ? String(entry.department) : undefined,
        title: entry.title ? String(entry.title) : undefined,
        memberOf: getMemberOf(entry.memberOf),
      }
    }
    finally {
      await client.unbind().catch(() => undefined)
    }
  }

  private mapLdapUserToAppUser(payload: JWTPayload, ldapUser: LdapUser): AppUser {
    const realmRoles = getRealmRoles(payload)
    const clientRoles = getClientRoles(payload, this.clientId)
    const ldapGroups = ldapUser.memberOf.map(dn => dn.match(/CN=([^,]+)/i)?.[1] || dn)

    const roles = Array.from(new Set([
      ...realmRoles,
      ...clientRoles,
      ...ldapGroups
        .filter(group => group.toLowerCase().includes('admin'))
        .map(() => 'admin'),
    ]))

    return {
      id: ldapUser.username,
      keycloakId: String(payload.sub),
      username: ldapUser.username,
      email: ldapUser.email,
      displayName: ldapUser.displayName,
      department: ldapUser.department,
      title: ldapUser.title,
      roles,
      groups: ldapGroups,
      ldap: ldapUser,
      sso: {
        provider: 'keycloak',
        subject: String(payload.sub),
        preferredUsername: getStringClaim(payload, 'preferred_username'),
        realmRoles,
        clientRoles,
      },
    }
  }
}
