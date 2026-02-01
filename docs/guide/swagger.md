---
editLink: false
---
# Swagger (legacy)

Le module supporte **feathers-swagger** (legacy). C’est un middleware (pas un service Feathers) et il est monté avant l’enregistrement des services afin de collecter leurs métadonnées `docs`.

## Dépendances

```bash
bun add feathers-swagger swagger-ui-dist
```

## Activer

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    swagger: true,
  },
})
```

## URLs (REST monté sur `/feathers`)

- UI : `http://localhost:3000/feathers/docs/`
- Spec : `http://localhost:3000/feathers/swagger.json`

## Note importante

Dans cette implémentation, la spec est volontairement **fixée à `/swagger.json`** côté Swagger (comportement stable validé). En conséquence, dans l’UI, l’URL de la spec doit être `../swagger.json`.

---

Si tu veux ajouter des tags/sécurité/exemples, utilise la propriété `feathers.swagger.info` et la propriété `docs` sur chaque service généré.
