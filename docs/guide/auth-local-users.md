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

## Identifiants d'entité portables

NFZ ne force plus l'identifiant de l'entité d'authentification à être un ObjectId MongoDB. La stratégie locale préserve tels quels les identifiants primitifs utilisés par les services SQL ou Memory : nombres entiers, UUID, chaînes et bigint décimaux. Seuls les objets BSON `ObjectId` provenant éventuellement d'une autre copie du driver MongoDB sont normalisés vers leur représentation hexadécimale avant la relecture externe de l'entité.

Cette normalisation n'effectue aucune conversion numérique implicite et ne modifie pas la validation de l'adapter cible. Le choix de `idStrategy` du service `users` doit donc correspondre au schéma et au stockage réellement utilisés.

Le service d’authentification doit hacher le champ de mot de passe avant écriture et le protéger dans les réponses externes. Validez aussi le schéma :

```bash
bunx nuxt-feathers-zod schema users --validate
bunx nuxt-feathers-zod schema users --repair-auth
```

<!-- release-version: 6.7.51 -->
