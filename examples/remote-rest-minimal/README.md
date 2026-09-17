# Minimal remote REST

Exemple minimal pour consommer un backend Feathers existant avec **nuxt-feathers-zod 6.7.51**.

```bash
cp .env.example .env
bun install
bun dev
```

Le point important est la séparation des rôles :

```txt
Nuxt/NFZ = client remote
Feathers = backend distant
Nitro = aucun proxy obligatoire
```

Le service `messages` doit exister sur le backend distant. Après génération ou déclaration de ses types client, le code applicatif utilise le client NFZ normal :

```ts
const { api } = useFeathers()
const page = await api.service('messages').find({ query: { $limit: 20 } })
```

Pour un cas SSO plus complet, voir `nuxt4-keycloak-ldap-spa-ref` et `nuxt4-keycloak-ldap-ssr-ref`.
