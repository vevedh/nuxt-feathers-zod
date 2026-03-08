---
editLink: false
---
# Socle open source standard

Cette page fixe le **périmètre open core** à stabiliser dans `nuxt-feathers-zod`.

L’idée est simple :

- garder un noyau **prévisible, documenté et testable** en open source,
- réserver plus tard les couches “console avancée / productivité / enterprise” à une éventuelle offre sous licence,
- éviter de fragiliser le runtime principal avec des fonctionnalités encore mouvantes.

## Périmètre open source à figer

Le socle standard couvre déjà les usages suivants.

### 1) Intégration Nuxt 4 + Feathers v5

- mode **embedded** : serveur Feathers dans Nitro
- mode **remote** : client Feathers vers API externe
- transports **REST** et **Socket.IO**
- serveur embedded **Express** ou **Koa**

### 2) CLI supportée

- `init embedded`
- `init remote`
- `init templates`
- `add service`
- `add service --custom`
- `add remote-service`
- `add middleware`
- `doctor`

### 3) Services et runtime client

- services générés via la CLI
- support `memory` et `mongodb`
- services sans adapter avec méthodes custom
- `useService()` côté app
- intégration `feathers-pinia`
- config publique runtime cohérente pour le mode remote

### 4) Auth supportée

- auth locale / JWT
- auth remote JWT
- bridge **Keycloak SSO**

### 5) DX embedded

- secure defaults
- server modules intégrés
- Swagger legacy optionnel
- template overrides
- playground de validation

## Ce qui doit rester “standard”

Pour le socle open source, la règle recommandée est :

- une fonctionnalité documentée,
- un exemple minimal reproductible,
- un comportement testé,
- pas de dépendance à une console propriétaire,
- pas de couplage fort à un service SaaS tiers.

## Ce qui peut devenir premium plus tard

Bons candidats pour une future licence key :

- console visuelle avancée
- schema builder / init wizard avancé
- devtools dédiés enrichis
- packs RBAC/policies prêts à l’emploi
- diagnostics premium et diffing avancé
- discovery / inventory distante sécurisée
- presets “enterprise”
- générateurs métier spécialisés
- packs de templates avancés

## Règles de stabilisation recommandées

### Ne plus casser les parcours de base

Les parcours à garantir en priorité sont :

1. **Nouvelle app Nuxt 4 + embedded**
2. **Nouvelle app Nuxt 4 + embedded + auth locale**
3. **Nouvelle app Nuxt 4 + remote REST**
4. **Nouvelle app Nuxt 4 + remote Socket.IO**
5. **Nouvelle app Nuxt 4 + Keycloak SSO**

### Standardiser la méthode officielle

Toujours privilégier :

```bash
bunx nuxt-feathers-zod init ...
bunx nuxt-feathers-zod add service ...
```

et éviter les créations manuelles tant qu’un générateur officiel existe.

### Documenter les invariants

À conserver comme conventions publiques :

- `servicesDirs: ['services']`
- CLI-first
- `memory` par défaut
- `--schema none` par défaut
- alias historique supporté mais non recommandé
- config publique client cohérente en mode remote

## Proposition de feuille de route open source

### Niveau 1 — stabilité

- smoke tests CLI pour `init embedded` et `init remote`
- smoke test build pour `playground`
- smoke test docs VitePress
- matrice Windows + Linux

### Niveau 2 — lisibilité

- exemples “new Nuxt 4 app” sur chaque grande page
- pages de référence alignées sur les vraies options
- section “known limits” explicite

### Niveau 3 — maintenance

- policy de dépréciation claire
- changelog orienté rupture / migration
- exemples versionnés

## Commande de référence : nouvelle app Nuxt 4 embedded

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Commande de référence : nouvelle app Nuxt 4 remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```
