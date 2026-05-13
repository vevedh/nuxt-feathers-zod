export interface KeycloakSsoInfo {
  provider: 'keycloak'
  subject: string
  preferredUsername?: string
  email?: string
  realmRoles: string[]
  clientRoles: string[]
  raw?: Record<string, unknown>
}

export interface LdapRawUser {
  dn?: string
  cn?: string
  sAMAccountName?: string
  userPrincipalName?: string
  mail?: string
  displayName?: string
  givenName?: string
  sn?: string
  department?: string
  title?: string
  company?: string
  telephoneNumber?: string
  mobile?: string
  physicalDeliveryOfficeName?: string
  memberOf?: string[]
  manager?: string
  employeeID?: string
  employeeNumber?: string
  accountExpires?: string | number
  userAccountControl?: string | number
  whenCreated?: string
  whenChanged?: string
  lastLogonTimestamp?: string | number
  [key: string]: unknown
}

export interface LdapAppUser {
  id: string
  username: string
  email?: string
  displayName?: string
  firstName?: string
  lastName?: string
  department?: string
  title?: string
  company?: string
  office?: string
  phone?: string
  mobile?: string
  roles: string[]
  groups: string[]
  isAdmin: boolean
  isDsi: boolean
  keycloakId?: string
  ldap: LdapRawUser
  sso: KeycloakSsoInfo
}

export interface KeycloakLdapAuthResult {
  accessToken?: string
  access_token?: string
  token?: string
  authentication?: {
    strategy?: string
    provider?: string
    subject?: string
    username?: string
  }
  user?: LdapAppUser
}
