---
editLink: false
---
# API runtime

Le module expose plusieurs injections côté application Nuxt.

## `$api`

Client Feathers principal.

```ts
const { $api } = useNuxtApp()
```

En pratique, c'est l'alias à utiliser en premier dans l'application.

## `$client`

Alias de `$api`.

## `$feathersClient`

Référence bas niveau du client Feathers généré.

## `$piniaClient`

Client Feathers-Pinia quand `feathers.client.pinia` est activé.

```ts
const { $piniaClient } = useNuxtApp()
```

## Runtime généré

Le runtime client est généré dans :

```txt
.nuxt/feathers/client/
```

Fichiers typiques :

```txt
client.ts
plugin.ts
connection.ts
```

## Auth client

Quand une couche auth applicative est générée, on retrouve généralement :

```txt
app/plugins/nfz-auth.client.ts
app/middleware/auth.global.ts
```

Ces fichiers appartiennent à l'application consommatrice, pas au module lui-même.
