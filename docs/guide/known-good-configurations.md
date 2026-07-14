# Configurations validées (OSS)

Cette page résume les configurations considérées comme **connues et valides** après la stabilisation OSS.

## Embedded

### Embedded + Express + auth locale

```ts
feathers: {
  client: { mode: 'embedded' },
  transports: {
    rest: { path: '/feathers', framework: 'express' },
    websocket: true,
  },
  auth: true,
}
```

### Embedded + Express + MongoDB

```ts
feathers: {
  client: { mode: 'embedded' },
  transports: {
    rest: { path: '/feathers', framework: 'express' },
    websocket: true,
  },
  database: {
    mongo: { url: 'mongodb://localhost:27017/app' },
  },
  auth: true,
}
```

### Embedded + Koa + sans auth

```ts
feathers: {
  client: { mode: 'embedded', pinia: false },
  transports: {
    rest: { path: '/feathers', framework: 'koa' },
    websocket: false,
  },
  auth: false,
}
```

## Remote

### Remote + REST

```ts
feathers: {
  client: {
    mode: 'remote',
    remote: {
      url: 'https://api.example.com',
      transport: 'rest',
      services: [{ path: 'messages' }],
    },
  },
  auth: false,
}
```

### Remote + Socket.IO + JWT

```ts
feathers: {
  client: {
    mode: 'remote',
    remote: {
      url: 'https://api.example.com',
      transport: 'socketio',
      auth: { enabled: true, payloadMode: 'jwt' },
      services: [{ path: 'messages' }, { path: 'users' }],
    },
  },
}
```

## Validation rapide

Depuis la racine du dépôt :

```bash
bun install
bun run module:build
bunx nuxi@latest build
bun test
```

Pour les scénarios playground, utiliser les fichiers `playground/.env.*.example` puis valider aussi l’onglet **NFZ** dans DevTools.
