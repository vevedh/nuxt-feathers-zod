<script setup lang="ts">
interface MongoRecord {
  _id?: string
  id?: string
  text?: string
  [key: string]: unknown
}

interface PaginatedResult<T> {
  total: number
  data: T[]
}

const service = useService('mongos')
const piniaRuntime = useNfzPinia()

const result = ref<PaginatedResult<MongoRecord>>({
  total: 0,
  data: [],
})
const loading = ref(false)
const errorMessage = ref<string | null>(null)

function normalizeFindResult(payload: unknown): PaginatedResult<MongoRecord> {
  if (Array.isArray(payload)) {
    return {
      total: payload.length,
      data: payload as MongoRecord[],
    }
  }

  if (!payload || typeof payload !== 'object') {
    return {
      total: 0,
      data: [],
    }
  }

  const page = payload as {
    total?: unknown
    data?: unknown
  }
  const data = Array.isArray(page.data)
    ? page.data as MongoRecord[]
    : []
  const total = typeof page.total === 'number'
    ? page.total
    : data.length

  return {
    total,
    data,
  }
}

async function loadMongos(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const response = await service.find({
      query: {
        $limit: 20,
      },
    })

    result.value = normalizeFindResult(response)
  }
  catch (error: unknown) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Impossible de lire le service mongos.'
  }
  finally {
    loading.value = false
  }
}

onMounted(loadMongos)
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Client Feathers et Pinia"
      title="Service mongos"
      description="Contrôlez un appel find() direct avec useService() et la disponibilité de Pinia pour les stores applicatifs."
    >
      <template #actions>
        <button
          class="nfz-button nfz-button--small"
          type="button"
          :disabled="loading"
          @click="loadMongos"
        >
          {{ loading ? 'Actualisation…' : 'Actualiser' }}
        </button>
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card">
        <span>Total</span>
        <strong>{{ result.total }}</strong>
        <small>Documents disponibles</small>
      </article>
      <article class="nfz-stat-card">
        <span>Éléments chargés</span>
        <strong>{{ result.data.length }}</strong>
        <small>Limite de lecture : 20</small>
      </article>
      <article class="nfz-stat-card">
        <span>Pinia</span>
        <strong>{{ piniaRuntime.available ? 'Disponible' : 'Indisponible' }}</strong>
        <small>Stores applicatifs explicites</small>
      </article>
    </div>

    <p v-if="errorMessage" class="nfz-alert nfz-alert--danger">
      {{ errorMessage }}
    </p>

    <PlaygroundPanel
      title="Lecture Feathers directe"
      description="useService('mongos') retourne le service Feathers typé. Les opérations CRUD utilisent directement find(), get(), create(), patch() et remove()."
    >
      <div v-if="result.data.length" class="nfz-table-wrap">
        <table class="nfz-table">
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Texte</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in result.data"
              :key="String(item._id || item.id || index)"
            >
              <td><code>{{ item._id || item.id || '—' }}</code></td>
              <td>{{ item.text || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="!loading && !errorMessage" class="nfz-alert">
        Aucun document n'est disponible dans le service mongos.
      </p>
    </PlaygroundPanel>

    <PlaygroundJsonPanel
      title="Résultat Feathers"
      :value="result.data"
      :collapsed="true"
    />
  </div>
</template>
