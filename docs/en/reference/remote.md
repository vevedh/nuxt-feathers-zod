---
editLink: false
---
# Remote mode

In remote mode the module does not start a local Feathers server.
It configures a Feathers client that points to an external API.

## Minimal configuration

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest'
      }
    }
  }
})
```
