
# Authentification locale – service users

Le module **nuxt-feathers-zod** configure l’authentification locale uniquement pour le service `users`.

## Valeurs par défaut

```ts
local: {
  usernameField: 'userId',
  passwordField: 'password'
}
```

## Génération

```bash
bunx nuxt-feathers-zod add service users --auth
```

## Changer le champ d’identifiant

```bash
bunx nuxt-feathers-zod add service users --auth --localUsernameField email
```

## Sécurité

- `hashPassword(passwordField)`
- `protect(passwordField)`
- Aucun mot de passe exposé côté client
