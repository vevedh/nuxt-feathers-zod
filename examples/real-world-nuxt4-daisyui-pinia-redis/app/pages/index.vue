<script setup lang="ts">
import { Badge, Button } from 'daisy-ui-kit'

definePageMeta({ public: true })

const stack = [
  'Nuxt 4',
  'Vue 3',
  'DaisyUiKit via daisy-ui-kit/nuxt',
  'UnoCSS ou Tailwind CSS (Tailwind CSS 4 dans cet exemple)',
  'Pinia',
  'MongoDB',
  'FeathersJS v5 embedded',
  'Auth locale/JWT',
  'RBAC admin/member',
  'services métier NFZ + Redis Cache',
  'dark/light',
  'customizable themes',
]
</script>

<template>
  <div class="nfz-grid">
    <section
      class="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_.85fr] lg:px-8"
      style="min-height: calc(100vh - 4rem)"
    >
      <div>
        <Badge primary class="mb-5">
          Real-world example
        </Badge>
        <h1 class="max-w-5xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Intégrer NFZ + redis cache dans une vraie application Nuxt 4 + DaisyUiKit + Pinia
        </h1>
        <p class="mt-6 max-w-3xl text-lg leading-8 opacity-75">
          Ce guide explique comment intégrer <code>nuxt-feathers-zod</code> dans une application métier complète basée sur :
        </p>

        <div class="mt-8 grid gap-3 sm:grid-cols-2">
          <div
            v-for="item in stack"
            :key="item"
            class="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm"
          >
            <span class="badge badge-success badge-sm" aria-hidden="true"></span>
            <span class="font-semibold">{{ item }}</span>
          </div>
        </div>

        <p class="mt-8 max-w-3xl text-lg opacity-75">
          Pour une application avec dashboard, administration, authentification et services métier.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <Button is="a" primary lg href="/login">
            Tester l'authentification
          </Button>
          <Button is="a" outline lg href="/dashboard">
            Voir le dashboard
          </Button>
        </div>
      </div>

      <aside class="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-bold uppercase tracking-widest opacity-50">
              Architecture
            </p>
            <h2 class="mt-1 text-2xl font-black">
              Cache Redis sans fuite de secrets
            </h2>
          </div>
          <Badge success>
            TTL 60 s
          </Badge>
        </div>

        <div class="mt-6 mockup-code text-sm">
          <pre data-prefix="1"><code>Browser → Nuxt UI → Pinia</code></pre>
          <pre data-prefix="2"><code>                ↓ JWT</code></pre>
          <pre data-prefix="3"><code>          NFZ / Feathers v5</code></pre>
          <pre data-prefix="4"><code>           ↙           ↘</code></pre>
          <pre data-prefix="5"><code>      MongoDB        Redis</code></pre>
          <pre data-prefix="6"><code>       data        hot cache</code></pre>
        </div>

        <div class="alert alert-info mt-6">
          <span>
            Le mot de passe Redis reste dans <code>runtimeConfig</code> privé et n'est jamais envoyé au navigateur.
          </span>
        </div>
      </aside>
    </section>
  </div>
</template>
