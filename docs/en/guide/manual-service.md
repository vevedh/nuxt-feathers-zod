---
editLink: false
---
# Manual service (no adapter)

This guide shows how to **manually** create a Feathers service (no database, no adapter, no CLI)
while staying **fully compatible** with `nuxt-feathers-zod`.

This kind of service is great for:
- business actions (jobs, commands)
- third‑party API calls
- system / automation endpoints
- “command-style” endpoints (`run`, `execute`, `reindex`, …)

---

## Required structure

A manual service must follow **exactly** this structure:

```txt
services/ping/
  ping.ts
  ping.class.ts
  ping.schema.ts
  ping.shared.ts
```

⚠️ All files are **mandatory**.

---

## 1) Service implementation

### `services/ping/ping.class.ts`

```ts
import type { Params } from '@feathersjs/feathers'
import type { PingRunData, PingRunResult } from './ping.schema'

export class PingService {
  async find(_params: Params) {
    return [{ ok: true, at: new Date().toISOString() }]
  }

  async run(data: PingRunData, _params: Params): Promise<PingRunResult> {
    return {
      acknowledged: true,
      message: `pong: ${data.message}`,
      at: new Date().toISOString(),
    }
  }
}
```

---

## 2) Zod schemas (required)

### `services/ping/ping.schema.ts`

```ts
import { z } from 'zod'

export const pingResultSchema = z.object({
  ok: z.boolean(),
  at: z.string(),
})

export const pingRunDataSchema = z.object({
  message: z.string().min(1),
})

export const pingRunResultSchema = z.object({
  acknowledged: z.boolean(),
  message: z.string(),
  at: z.string(),
})

export type PingResult = z.infer<typeof pingResultSchema>
export type PingRunData = z.infer<typeof pingRunDataSchema>
export type PingRunResult = z.infer<typeof pingRunResultSchema>
```

This file is **required** because:
- it powers the module type scan (`*.schema.ts`)
- it enables full client typing
- it prevents issues like `Services typeExports []`

---

## 3) Server registration

### `services/ping/ping.ts`

```ts
import type { Application } from 'nuxt-feathers-zod/server'
import { PingService } from './ping.class'

export const pingPath = 'ping'

export const ping = (app: Application) => {
  app.use(pingPath, new PingService(), {
    methods: ['find', 'run'],
  })
}
```

⚠️ The file must be named `ping.ts` (single suffix).
Avoid `ping.server.ts`, `ping.api.ts`, etc.

---

## 4) Client registration (SSR-safe + transport‑agnostic)

### `services/ping/ping.shared.ts`

```ts
import type { Params } from '@feathersjs/feathers'
import type { Application } from 'nuxt-feathers-zod/client'
import type { PingRunData, PingRunResult, PingResult } from './ping.schema'

export const pingPath = 'ping'

type PingClient = {
  find(params?: Params): Promise<PingResult[]>
  run(data: PingRunData, params?: Params): Promise<PingRunResult>
}

export const pingClient = (client: Application) => {
  const connection = client.get('connection')
  const remote: any = connection.service(pingPath)

  // ✅ SSR: only register native methods
  if (import.meta.server) {
    client.use(pingPath, remote, { methods: ['find'] })
    return
  }

  // ✅ Browser: patch run() BEFORE client.use()
  if (!remote.run) {
    remote.run = async (data: PingRunData, params?: Params) => {
      // 1) REST custom method (best effort)
      if (typeof remote.request === 'function') {
        return remote.request({
          method: 'POST',
          url: `/${pingPath}/run`,
          body: data,
          params,
        })
      }

      // 2) Socket low-level (best effort)
      if (typeof remote.send === 'function') {
        return remote.send('run', data, params)
      }

      // 3) HTTP fallback via $fetch (transport‑agnostic)
      const cfg = useRuntimeConfig().public as any
      const restPrefix =
        cfg?.feathers?.rest?.path ??
        cfg?.feathers?.restPath ??
        cfg?.feathers?.rest?.prefix ??
        '/feathers'

      const baseURL =
        cfg?.feathers?.restUrl ??
        cfg?.feathers?.baseURL ??
        ''

      return $fetch(`${baseURL}${restPrefix}/${pingPath}/run`, {
        method: 'POST',
        body: data,
        headers: params?.headers,
      })
    }
  }

  client.use(pingPath, remote, { methods: ['find', 'run'] })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [pingPath]: PingClient
  }
}
```

---

## 5) Usage in Nuxt

```ts
const ping = useService('ping')

await ping.find()
await ping.run({ message: 'hello' })
```

---

## Rules recap

- Never register custom methods on the client during **SSR**
- Patch custom methods in the browser **before** `client.use()`
- Read `restPrefix/restUrl` from `runtimeConfig.public.feathers`
- Always include a `*.schema.ts` file (type scan + typing)
