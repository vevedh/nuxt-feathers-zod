---
editLink: false
---
# Politique de support

## Ce qui est supporté dans le core standard

Le support prioritaire couvre :

- Nuxt 4
- Bun
- embedded / remote
- REST / Socket.IO
- Express / Koa
- auth locale / JWT
- bridge Keycloak SSO
- CLI de génération
- Swagger legacy optionnel

## Ce qui est supporté en priorité

Quand une régression apparaît, les parcours à protéger en premier sont :

1. nouvelle app Nuxt 4 + `init embedded`
2. embedded + `users` + auth locale
3. remote REST
4. remote Socket.IO
5. Keycloak bridge

## Dépréciations

Les alias historiques peuvent rester supportés, mais :

- ils ne doivent plus être la forme recommandée
- la doc doit afficher la forme canonique
- le changement doit être tracé dans `PATCHLOG.md`

## Principe de correction

Une correction “core” doit privilégier :

- compatibilité arrière quand c’est raisonnable
- exemple minimal mis à jour
- docs FR/EN alignées
- journalisation dans `PATCHLOG.md` et `PROMPT_CONTEXT.md`
