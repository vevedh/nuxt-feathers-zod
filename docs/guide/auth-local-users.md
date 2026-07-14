# Authentification locale et service `users`

L’authentification locale s’appuie sur le service configuré par `feathers.auth.service`. La valeur par défaut est `users`.

## Générer le service

```bash
bunx nuxt-feathers-zod add service users --auth --schema zod
```

## Champs locaux

La configuration réelle se fait dans `nuxt.config.ts` :

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    auth: {
      service: 'users',
      local: {
        usernameField: 'email',
        passwordField: 'password',
        entityUsernameField: 'email',
        entityPasswordField: 'password',
      },
    },
  },
})
```

La CLI ne propose pas de flag `--localUsernameField`. Cette option appartient à `feathers.auth.local.usernameField`.

## Protection du mot de passe

Le service d’authentification doit hacher le champ de mot de passe avant écriture et le protéger dans les réponses externes. Validez aussi le schéma :

```bash
bunx nuxt-feathers-zod schema users --validate
bunx nuxt-feathers-zod schema users --repair-auth
```

<!-- release-version: 6.5.41 -->
