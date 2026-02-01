---
editLink: false
---
# Keycloak-only SSO (validated pattern)

This guide documents the validated Keycloak-only SSO flow used in the reference project.

Key ideas:

- verify access tokens via JWKS (`jose`)
- SSR-safe initialization
- `useAuth()` is idempotent
- optional `whoami()` hydration after login

If the user is temporarily `null` on first render, `useAuth()` retries `whoami()` and may fall back to token claims (e.g. `preferred_username`) on the client.
