---
editLink: false
---
# Service d'upload/download de fichiers

Ce starter CLI crée un **service Feathers adapter-less** prêt pour :

- **upload** local via `upload(data)`
- **download** via `download({ id })`
- **listing** via `find()`
- **lecture des métadonnées** via `get(id)`
- **suppression** via `remove(id)`

Le stockage est local sur disque, dans un dossier configurable. Le starter est pensé comme une **base claire et auto-hébergée** pour Nuxt 4 + NFZ, pas comme un remplacement direct d'un stockage objet type S3.

## Pré-requis : créer d'abord une app Nuxt 4

```bash
bunx nuxi@latest init my-nfz-files
cd my-nfz-files
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

## Génération du service

```bash
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
bun dev
```

## Contrat du starter

### Upload

```ts
await api.service('api/v1/assets').upload({
  fileName: 'hello.txt',
  mimeType: 'text/plain',
  dataBase64: btoa('hello world'),
  metadata: { folder: 'docs' },
})
```

### Download

```ts
await api.service('api/v1/assets').download({ id: '...' })
```

Le résultat renvoie les métadonnées du fichier et `dataBase64`.

## Options utiles

```bash
bunx nuxt-feathers-zod add file-service assets \
  --path api/v1/assets \
  --storageDir storage/assets \
  --auth true \
  --docs true
```

- `--path` : path Feathers du service
- `--storageDir` : dossier local de stockage
- `--auth` : protège le service par JWT
- `--docs` : ajoute la métadonnée Swagger legacy


## Limites et garde-fous du starter

Le starter généré reste volontairement **local et simple**. Dans `*.class.ts`, il ajoute désormais :

- un contrôle de **taille maximale** configurable (`<serviceName>MaxBytes` ou `nfzFileMaxBytes`)
- une **allowlist MIME** configurable (`<serviceName>AllowedMimeTypes` ou `nfzFileAllowedMimeTypes`)
- une normalisation du nom de fichier avant écriture disque

Exemple d'usage côté app :

```ts
export default defineNuxtConfig({
  hooks: {
    "app:created"(app) {
      app.set("assetsMaxBytes", 20 * 1024 * 1024)
      app.set("assetsAllowedMimeTypes", ["image/png", "image/jpeg", "application/pdf"])
    },
  },
})
```

## Ce que ce starter ne couvre pas encore

Ce starter est une **base locale auto-hébergée**, pas une brique objet-storage complète. Il ne couvre pas encore :

- multipart/form-data
- streaming/range download
- stockage S3 / MinIO / OVH Object Storage
- signed URLs
- antivirus / DLP
- ownership avancé / quotas

Quand tu dépasses ce périmètre, garde le contrat Feathers `upload()` / `download()` mais remplace l'implémentation de stockage.

## Flux de travail recommandé dans le repo module

Pour travailler sur le repo du module lui-même, préfère :

```bash
bun run clean:repo
bun install
```

et évite `bunx nuxi cleanup` avant installation, qui suppose déjà `@nuxt/kit` présent localement.
