# Troubleshooting

## `/feathers/<service>` returns 404

Likely causes:

- no embedded service was detected
- the embedded plugin crashed before `await app.setup()`
- the generated service expects MongoDB but `mongodbClient` is not configured

Checklist:

```bash
bunx nuxt-feathers-zod doctor
bunx nuxt-feathers-zod add service users --adapter memory
```
