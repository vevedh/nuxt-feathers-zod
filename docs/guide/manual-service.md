---
editLink: false
---
# Service manuel (sans adapter)

Ce guide explique comment créer **manuellement** un service Feathers (sans base de données, sans adapter, sans CLI),
tout en restant **100 % compatible** avec `nuxt-feathers-zod`.

Ce type de service est idéal pour :
- des actions métier (jobs, workers, commandes)
- des appels à des APIs tierces
- des traitements système
- des endpoints "command-style" (`run`, `execute`, `reindex`, etc.)

---

## Structure obligatoire

Un service manuel doit respecter **exactement** cette structure :

```txt
services/ping/
  ping.ts
  ping.class.ts
  ping.schema.ts
  ping.shared.ts
```

⚠️ Tous les fichiers sont **obligatoires**.

---

## 1) Implémentation du service

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

## 2) Schémas Zod (obligatoire)

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

👉 Ce fichier est **indispensable** :
- il permet le **scan des types** (`*.schema.ts`)
- il alimente le **typage client**
- il évite les erreurs du style `Services typeExports []`

---

## 3) Enregistrement serveur

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

⚠️ Le fichier doit **impérativement** s’appeler `ping.ts` (suffixe simple).
Évite `ping.server.ts`, `ping.api.ts`, etc.

---

## 4) Enregistrement client (SSR-safe + transport-agnostic)

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

  // ✅ SSR: n'enregistre que les méthodes natives
  if (import.meta.server) {
    client.use(pingPath, remote, { methods: ['find'] })
    return
  }

  // ✅ Browser: patch run() AVANT client.use()
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

      // 3) HTTP fallback via $fetch (transport-agnostic)
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

## 5) Utilisation côté UI (Nuxt)

```ts
const ping = useService('ping')

await ping.find()
await ping.run({ message: 'hello' })
```

---

## Règles fondamentales (à retenir)

- ❌ Ne jamais déclarer une méthode custom côté client **en SSR**
- ✅ Patcher les méthodes custom **avant** `client.use()` en navigateur
- ✅ Lire `restPrefix/restUrl` depuis `runtimeConfig.public.feathers`
- ✅ Toujours fournir un `*.schema.ts` (scan types + typage)
