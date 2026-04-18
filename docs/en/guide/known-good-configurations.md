# Known good configurations (OSS)

This page summarizes the configurations considered **known-good and validated** after the OSS stabilization pass.

## Embedded

### Embedded + Express + local auth

```ts
feathers: {
  client: { mode: "embedded" },
  transports: {
    rest: { path: "/feathers", framework: "express" },
    websocket: true,
  },
  auth: true,
}
```

### Embedded + Express + MongoDB

```ts
feathers: {
  client: { mode: "embedded" },
  transports: {
    rest: { path: "/feathers", framework: "express" },
    websocket: true,
  },
  database: {
    mongo: { url: "mongodb://localhost:27017/app" },
  },
  auth: true,
}
```

### Embedded + Koa + no auth

```ts
feathers: {
  client: { mode: "embedded", pinia: false },
  transports: {
    rest: { path: "/feathers", framework: "koa" },
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
    mode: "remote",
    remote: {
      url: "https://api.example.com",
      transport: "rest",
      services: [{ path: "messages" }],
    },
  },
  auth: false,
}
```

### Remote + Socket.IO + JWT

```ts
feathers: {
  client: {
    mode: "remote",
    remote: {
      url: "https://api.example.com",
      transport: "socketio",
      auth: { enabled: true, payloadMode: "jwt" },
      services: [{ path: "messages" }, { path: "users" }],
    },
  },
}
```

## Quick validation

From the repository root:

```bash
bun install
bun run module:build
bunx nuxi@latest build
bun test
```

For playground scenarios, use the `playground/.env.*.example` files and also validate the **NFZ** tab in DevTools.
