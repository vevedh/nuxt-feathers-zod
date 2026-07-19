---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "The Feathers backend for Nuxt 4"
  tagline: "Build typed full-stack services, validate them with Zod, and use them from Vue in embedded or remote mode."
  image:
    src: /images/nfz-feather.webp
    alt: nuxt-feathers-zod feather logo
  actions:
    - theme: brand
      text: Start in 5 minutes
      link: /en/guide/getting-started
    - theme: alt
      text: Explore the playground
      link: /en/guide/playground
    - theme: alt
      text: API reference
      link: /en/reference/

features:
  - title: "Nuxt 4 + FeathersJS"
    details: "Keep Nuxt's developer experience while structuring your backend with Feathers services, hooks, events, and transports."
  - title: "Zod validation"
    details: "Validate data, patches, and queries on the server with reusable TypeScript schemas."
  - title: "Embedded or remote"
    details: "Run Feathers inside Nitro or connect your Nuxt application to an existing Feathers API."
  - title: "Modular authentication"
    details: "Use local/JWT, OIDC, Keycloak, or API keys behind one normalized principal."
  - title: "Project-oriented CLI"
    details: "Initialize the integration, generate services, and inspect configuration without copying a complete architecture."
  - title: "Verifiable playground"
    details: "Test runtime, services, and authentication in an interface documented by Playwright scenarios."
---

## Your first service in a few commands

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bunx nuxt-feathers-zod init embedded --auth
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
bun dev
```

Then use the service in a Vue component:

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

const messages = await $api.service('messages').find({
  query: {
    $limit: 20,
    $sort: { createdAt: -1 },
  },
})
</script>

<template>
  <pre>{{ messages }}</pre>
</template>
```

## The playground shows the real result

Screenshots are generated from the playground only after the related Playwright assertions pass. They explain how to use the module rather than exposing internal package maintenance.

![nuxt-feathers-zod playground dashboard](/images/guides/playwright/playwright-dashboard.png)

[Install the module](/en/guide/getting-started) · [Choose a mode](/en/guide/modes) · [Create a service](/en/guide/services)

## Project

- [npm package](https://www.npmjs.com/package/nuxt-feathers-zod)
- [GitHub repository](https://github.com/vevedh/nuxt-feathers-zod)

<!-- release-version: 6.6.0 -->
