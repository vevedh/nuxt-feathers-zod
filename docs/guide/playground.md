---
editLink: false
---
# Playground

Le `playground/` sert à valider rapidement le socle open source du module.

## Ce qu’il permet de vérifier

- build embedded
- build remote
- connexion REST / Socket.IO
- auth locale / remote / Keycloak
- comportement d’un service généré

## Pages utiles

- `/tests` : diagnostics connexion + auth
- `/messages` : exemple CRUD simple
- `/ldapusers` : exemple de service remote déclaré explicitement

## Routine de validation recommandée

### 1) Valider la build module

```bash
bun run build
```

### 2) Lancer le playground

```bash
bun dev
```

### 3) Vérifier `/tests`

Contrôles utiles :

- appel `find()` sur un service déclaré
- auth locale
- auth token payload
- SSO Keycloak si activé

## Pourquoi le playground est important

Pour figer le core open source, il doit rester un terrain de validation simple et stable.
