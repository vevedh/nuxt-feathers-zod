<script setup lang="ts">
import LicenseGuardBadge from './LicenseGuardBadge.vue'

const props = withDefaults(defineProps<{
  items: Array<Record<string, any>>
  title?: string
  showFilters?: boolean
}>(), {
  title: 'Fonctionnalités',
  showFilters: true,
})

const search = ref('')
const category = ref<'all' | string>('all')
const stateFilter = ref<'all' | 'enabled' | 'disabled' | 'locked'>('all')

const categoryLabels: Record<string, string> = {
  all: 'Toutes',
  core: 'Core',
  builder: 'Builder',
  diagnostics: 'Diagnostics',
  admin: 'Admin',
  integrations: 'Intégrations',
  branding: 'Branding',
}

const categories = computed(() => ['all', ...new Set(props.items.map(item => item.category).filter(Boolean))])
const stateOptions = [
  { label: 'Tous les états', value: 'all' },
  { label: 'Disponibles', value: 'enabled' },
  { label: 'Désactivés', value: 'disabled' },
  { label: 'Verrouillés', value: 'locked' },
]

function stateOrder(state: string) {
  if (state === 'enabled') return 0
  if (state === 'disabled') return 1
  return 2
}

const summary = computed(() => ({
  enabled: props.items.filter(item => item.state === 'enabled').length,
  disabled: props.items.filter(item => item.state === 'disabled').length,
  locked: props.items.filter(item => item.state === 'locked').length,
}))

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  return [...props.items]
    .filter((item) => {
      const matchesCategory = category.value === 'all' || item.category === category.value
      const matchesState = stateFilter.value === 'all' || item.state === stateFilter.value
      const haystack = `${item.title} ${item.description} ${item.key} ${item.reason || ''}`.toLowerCase()
      const matchesSearch = !term || haystack.includes(term)
      return matchesCategory && matchesState && matchesSearch
    })
    .sort((a, b) => stateOrder(a.state) - stateOrder(b.state) || a.title.localeCompare(b.title))
})
</script>

<template>
  <QCard flat bordered class="dash-panel p-4 md:p-5">
    <QCardSection class="p-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <div class="dash-kicker">License Center</div>
        <div class="mt-1 text-lg font-semibold nfz-title">{{ title }}</div>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <QChip dense color="positive" text-color="white">{{ summary.enabled }} disponibles</QChip>
        <QChip dense color="warning" text-color="dark">{{ summary.disabled }} désactivées</QChip>
        <QChip dense color="grey-7">{{ summary.locked }} verrouillées</QChip>
      </div>
    </QCardSection>

    <QSeparator class="my-4" />

    <div v-if="showFilters" class="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
      <QInput v-model="search" outlined dense clearable label="Rechercher une option" />
      <QSelect
        v-model="category"
        outlined
        dense
        label="Catégorie"
        :options="categories.map(value => ({ value, label: categoryLabels[value] || value }))"
        emit-value
        map-options
      />
      <QSelect v-model="stateFilter" outlined dense label="État" :options="stateOptions" emit-value map-options />
    </div>

    <div class="grid gap-3">
      <div v-for="item in filteredItems" :key="item.key" class="builder-soft-card px-4 py-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <div class="font-semibold nfz-title">{{ item.title }}</div>
              <QChip dense square size="sm" color="grey-8">{{ categoryLabels[item.category] || item.category }}</QChip>
              <QChip v-if="item.premium" dense square size="sm" color="secondary">premium</QChip>
            </div>
            <div class="mt-1 text-sm nfz-subtitle">{{ item.description }}</div>
            <div v-if="item.reason" class="mt-2 text-xs nfz-subtitle">{{ item.reason }}</div>
          </div>

          <div class="flex flex-wrap items-center gap-2 lg:justify-end">
            <LicenseGuardBadge :state="item.state" :hint="item.reason" />
            <QBtn v-if="item.route" dense flat color="primary" icon="open_in_new" :to="item.route" label="Ouvrir" />
          </div>
        </div>
      </div>

      <QBanner v-if="!filteredItems.length" rounded class="bg-[var(--nfz-primary-soft)] text-sm">
        <div class="font-medium">Aucune option ne correspond aux filtres actuels.</div>
        <div class="mt-1">Essaie une autre catégorie, un autre état ou vide la recherche.</div>
      </QBanner>
    </div>
  </QCard>
</template>
