# Minimal embedded Memory

Le plus petit exemple maintenu pour comprendre **nuxt-feathers-zod 6.7.51** sans MongoDB, SQL, Quasar ou authentification.

```bash
bun install
bun dev
```

Il montre quatre éléments :

1. `nuxt-feathers-zod` en mode `embedded` ;
2. un service Feathers `MemoryService` chargé depuis `services/` ;
3. validation et query syntax avec Zod ;
4. `useService('messages')` côté Nuxt pour `find()` et `create()`.

Le stockage est volatile : un redémarrage vide les messages. C'est volontaire pour isoler le contrat NFZ avant d'introduire une base de données.

Pour générer la même structure depuis le CLI dans une application existante :

```bash
bunx nuxt-feathers-zod@6.7.51 add service messages --adapter memory --schema zod
```
