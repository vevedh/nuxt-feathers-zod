# Troubleshooting

## `/feathers/<service>` retourne 404

Causes probables :

- aucun service embedded détecté
- le plugin embedded a planté avant `await app.setup()`
- le service généré dépend de MongoDB alors que `mongodbClient` n'est pas configuré

Checklist :

```bash
bunx nuxt-feathers-zod doctor
bunx nuxt-feathers-zod add service users --adapter memory
```

## Embedded auth casse `postinstall`

Le module dégrade l'auth embedded pendant `prepare/postinstall` si aucun service/schema local n'est encore détecté.
