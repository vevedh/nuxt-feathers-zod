---
editLink: false
---
# File upload/download service

The CLI generates an **adapter-less Feathers service** for local, self-hosted file storage:

- `upload(data)` writes a file and its metadata;
- `download({ id })` returns metadata and Base64 content;
- `find()` lists stored descriptors;
- `get(id)` reads one descriptor;
- `remove(id)` deletes the binary file and descriptor.

This template is a secure local baseline for Nuxt 4 and NFZ. It is not a drop-in replacement for S3-compatible object storage.

## Generate the service

```bash
bunx nuxi@latest init my-nfz-files
cd my-nfz-files
bun install
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt

bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
bun dev
```

## Upload

```ts
await api.service('api/v1/assets').upload({
  fileName: 'hello.txt',
  mimeType: 'text/plain',
  dataBase64: btoa('hello world'),
  metadata: { folder: 'docs' },
})
```

The payload must contain canonical Base64. The generated service checks the encoded length before decoding, validates the decoded byte length and rejects malformed input.

## Download

```ts
const result = await api.service('api/v1/assets').download({
  id: '8d42d7d5-b6a5-4d1e-a6f1-62096a55b7ab',
})
```

File identifiers are UUIDs. `get`, `remove` and `download` reject any other identifier before resolving a filesystem path. The final `.bin` and `.json` paths are also checked to remain inside the configured storage directory.

## Useful options

```bash
bunx nuxt-feathers-zod add file-service assets \
  --path api/v1/assets \
  --storageDir storage/assets \
  --auth \
  --docs
```

- `--path`: Feathers service path;
- `--storageDir`: local storage directory;
- `--auth`: protects the service with the configured NFZ authentication providers;
- `--docs`: adds legacy Swagger metadata.

## Runtime safeguards

The generated `*.class.ts` supports:

- a maximum size through `<serviceName>MaxBytes` or `nfzFileMaxBytes`;
- a MIME allowlist through `<serviceName>AllowedMimeTypes` or `nfzFileAllowedMimeTypes`;
- canonical Base64 validation before decoding;
- UUID validation and resolved-path confinement;
- file-name normalization before writing.

Keys use the **complete service name**. For `attachments`, configure `attachmentsMaxBytes`. Earlier singular keys such as `attachmentMaxBytes` remain accepted only as compatibility fallbacks. The value is resolved again for every operation.

```ts
export default defineNuxtConfig({
  hooks: {
    'app:created'(app) {
      app.set('assetsMaxBytes', 20 * 1024 * 1024)
      app.set('assetsAllowedMimeTypes', [
        'image/png',
        'image/jpeg',
        'application/pdf',
      ])
    },
  },
})
```

## Limits

The local template does not provide multipart streaming, range downloads, S3/MinIO/OVH Object Storage, signed URLs, antivirus/DLP, ownership rules or quotas. Keep the Feathers `upload()` and `download()` contract and replace the storage implementation when those capabilities are required.

<!-- release-version: 6.8.0 -->
