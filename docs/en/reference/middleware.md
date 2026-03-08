---
editLink: false
---
# Middleware

The module can generate multiple middleware families.

## Client auth middleware

```bash
bunx nuxt-feathers-zod add middleware auth --target client
```

Generated files:

```txt
app/plugins/nfz-auth.client.ts
app/middleware/auth.global.ts
```


## Server modules

```bash
bunx nuxt-feathers-zod add middleware metrics --target server-module
```
