---
editLink: false
---
# File upload/download service

This CLI starter generates an **adapter-less Feathers service** ready for:

- local **upload** through `upload(data)`
- **download** through `download({ id })`
- **listing** through `find()`
- **metadata lookup** through `get(id)`
- **deletion** through `remove(id)`

It uses local disk storage and is meant as a **clear self-hosted starter** for Nuxt 4 + NFZ.

## First create a Nuxt 4 app

```bash
bunx nuxi@latest init my-nfz-files
cd my-nfz-files
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

## Generate the service

```bash
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
bun dev
```

## Starter contract

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

The result returns file metadata and `dataBase64`.


## Starter limits and guardrails

The generated starter intentionally stays **local and readable**. The generated `*.class.ts` now adds:

- a configurable **max file size** guard (`<serviceName>MaxBytes` or `nfzFileMaxBytes`)
- a configurable **allowed MIME types** guard (`<serviceName>AllowedMimeTypes` or `nfzFileAllowedMimeTypes`)
- filename normalization before writing to disk

Example inside an app:

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

## What this starter still does not cover

This is a **self-hosted local storage starter**, not a complete object-storage solution. It still does not cover:

- multipart/form-data
- streaming/range downloads
- S3 / MinIO / OVH Object Storage backends
- signed URLs
- antivirus / DLP
- advanced ownership / quotas

When you outgrow this scope, keep the Feathers `upload()` / `download()` contract and replace the storage implementation.

## Recommended repo-dev flow for the module itself

When you work inside the module repository, prefer:

```bash
bun run clean:repo
bun install
```

and avoid `bunx nuxi cleanup` before installation because it assumes `@nuxt/kit` is already locally installed.
