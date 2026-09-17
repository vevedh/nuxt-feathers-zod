<script setup lang="ts">
import { Badge, Button } from 'daisy-ui-kit'

interface DashboardSummary {
  users: number
  messages: number
  generatedAt: string
  cache: 'redis' | 'origin'
  ttlSeconds: number
}

definePageMeta({ roles: ['admin', 'member'] })

const session = useStudioSessionStore()
const summary = ref<DashboardSummary | null>(null)
const pending = ref(false)
const error = ref<string | null>(null)

async function loadSummary(force = false): Promise<void> {
  pending.value = true
  error.value = null
  try {
    const authorization = await session.getAuthorizationHeader()
    if (!authorization)
      throw new Error('Session JWT indisponible.')

    summary.value = await $fetch<DashboardSummary>('/api/dashboard/summary', {
      headers: { authorization },
      query: force ? { refresh: '1' } : undefined,
    })
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Impossible de charger le dashboard.'
  }
  finally {
    pending.value = false
  }
}

onMounted(() => loadSummary())
</script>

<template>
  <section class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-bold uppercase tracking-widest text-primary">
          Espace métier
        </p>
        <h1 class="mt-2 text-4xl font-black">
          Dashboard NFZ + Redis
        </h1>
        <p class="mt-2 opacity-65">
          Données agrégées depuis des services Feathers, cache partagé Redis.
        </p>
      </div>
      <Button outline :disabled="pending" @click="loadSummary(true)">
        Rafraîchir l'origine
      </Button>
    </div>

    <div v-if="error" class="alert alert-error mt-8">
      {{ error }}
    </div>

    <div class="mt-8 grid gap-5 md:grid-cols-3">
      <div class="stat rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div class="stat-title">
          Utilisateurs
        </div>
        <div class="stat-value">
          {{ summary?.users ?? '—' }}
        </div>
        <div class="stat-desc">
          service NFZ <code>users</code>
        </div>
      </div>
      <div class="stat rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div class="stat-title">
          Messages
        </div>
        <div class="stat-value">
          {{ summary?.messages ?? '—' }}
        </div>
        <div class="stat-desc">
          service métier <code>messages</code>
        </div>
      </div>
      <div class="stat rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div class="stat-title">
          Source
        </div>
        <div class="stat-value text-2xl">
          <Badge :success="summary?.cache === 'redis'" :info="summary?.cache !== 'redis'">
            {{ summary?.cache ?? '—' }}
          </Badge>
        </div>
        <div class="stat-desc">
          TTL {{ summary?.ttlSeconds ?? 60 }} secondes
        </div>
      </div>
    </div>

    <div class="mt-8 rounded-2xl border border-base-300 bg-base-100 p-6">
      <h2 class="text-xl font-black">
        Contrat de cache
      </h2>
      <ul class="mt-4 list-disc space-y-2 pl-5 opacity-75">
        <li>le JWT est vérifié avant toute lecture du cache ;</li>
        <li>aucune donnée personnelle n'est stockée dans la clé partagée ;</li>
        <li>la clé est versionnée et limitée par TTL ;</li>
        <li><code>?refresh=1</code> force une recomposition et remplace le cache.</li>
      </ul>
    </div>
  </section>
</template>
