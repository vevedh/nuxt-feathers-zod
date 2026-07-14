export default {
  authentication: {
    secret: process.env.AUTH_SECRET,
    entity: 'user',
    service: 'users',
    authStrategies: ['jwt', 'local', 'keycloak-ldap'],
    jwtOptions: {
      header: { typ: 'access' },
      audience: 'https://api.example.com',
      issuer: 'feathers',
      algorithm: 'HS256',
      expiresIn: '1d',
    },
  },

  keycloakServerUrl: process.env.KEYCLOAK_SERVER_URL,
  keycloakRealm: process.env.KEYCLOAK_REALM,
  keycloakClientId: process.env.KEYCLOAK_CLIENT_ID,

  ldapUrl: process.env.LDAP_URL,
  ldapBindDn: process.env.LDAP_BIND_DN,
  ldapBindPassword: process.env.LDAP_BIND_PASSWORD,
  ldapBaseDn: process.env.LDAP_BASE_DN,
}
