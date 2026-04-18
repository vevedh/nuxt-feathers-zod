<script setup lang="ts">
defineProps<{
  items: any[]
  selected: string
  database?: string
  loading?: boolean
}>()
const emit = defineEmits<{ select: [name: string], refresh: [] }>()

function getName(collection: any) {
  return collection?.name || collection?.collectionName || collection?.collection || ''
}
</script>

<template>
  <section class="nfz-panel rounded-6 h-full p-4 md:p-5">
    <div class="mb-4 flex items-center justify-between gap-2">
      <div>
        <div class="text-xs uppercase tracking-[0.24em] text-[var(--nfz-primary)]">Collection browser</div>
        <h2 class="text-lg font-semibold nfz-title">{{ database || 'Collections' }}</h2>
      </div>
      <QBtn flat color="primary" icon="refresh" round :loading="loading" @click="emit('refresh')" />
    </div>

    <div class="grid gap-2">
      <button
        v-for="collection in items"
        :key="getName(collection)"
        class="rounded-4 border px-3 py-3 text-left transition-all duration-200"
        :class="selected === getName(collection)
          ? 'border-emerald-300/40 bg-emerald-400/10 nfz-title'
          : 'border-white/10 bg-white/3 nfz-title/80 hover:border-emerald-300/25 hover:bg-white/6'"
        @click="emit('select', getName(collection))"
      >
        <div class="flex items-center gap-3">
          <div class="i-carbon-document text-lg text-emerald-2" />
          <div class="min-w-0">
            <div class="truncate font-medium">{{ getName(collection) || 'collection' }}</div>
            <div class="text-xs nfz-title/45">collection</div>
          </div>
        </div>
      </button>
    </div>

    <div v-if="!items.length && !loading" class="mt-4 rounded-4 border border-dashed border-white/10 px-3 py-4 text-sm nfz-title/45">
      Aucune collection détectée.
    </div>
  </section>
</template>
