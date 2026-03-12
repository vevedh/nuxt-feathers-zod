---
editLink: false
---
# Doctor

Run:

```bash
bunx nuxt-feathers-zod doctor
```

Typical checks include:

- mode and transports
- embedded services
- MongoDB signals
- remote URL and transport
- auth and Keycloak-related settings
- `database.mongo` configuration hints when relevant

## Goal

Doctor should produce actionable messages such as:

- generate a missing service
- enable `servicesDirs`
- fix auth config
- verify the remote target
- spot an inconsistent CLI/runtime baseline before an OSS-core release
