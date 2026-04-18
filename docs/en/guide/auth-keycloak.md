---
editLink: false
---
# Keycloak authentication

The reference project can be configured to work with Keycloak (OIDC).

General flow:

- user authenticates with Keycloak
- API verifies the JWT via JWKS
- optional: load user profile / permissions (UMA)

See: [Keycloak-only SSO](./keycloak-sso)
