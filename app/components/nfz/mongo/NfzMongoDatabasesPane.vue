<script setup lang="ts">
defineProps<{
  items: any[]
  selected: string
  loading?: boolean
}>()
const emit = defineEmits<{ select: [name: string], refresh: [] }>()

function getName(db: any) {
  return db?.name || db?.dbName || db?.databaseName || db?.database || db?.db || ''
}
</script>

<template>
  <section class="nfz-panel rounded-6 h-full p-4 md:p-5">
    <div class="mb-4 flex items-center justify-between gap-2">
      <div>
        <div class="text-xs uppercase tracking-[0.24em] text-[var(--nfz-primary)]">MongoDB</div>
        <h2 class="text-lg font-semibold nfz-title">Bases</h2>
      </div>
      <QBtn flat color="primary" icon="refresh" round :loading="loading" @click="emit('refresh')" />
    </div>

    <div class="grid gap-2">
      <button
        v-for="db in items"
        :key="getName(db)"
        class="group rounded-4 border px-3 py-3 text-left transition-all duration-200"
        :class="selected === getName(db)
          ? 'border-cyan-300/40 bg-cyan-400/10 nfz-title'
          : 'border-white/10 bg-white/3 nfz-title/80 hover:border-cyan-300/25 hover:bg-white/6'"
        @click="emit('select', getName(db))"
      >
        <div class="flex items-center gap-3">
          <div class="i-carbon-db2-database text-lg text-cyan-2" />
          <div class="min-w-0">
            <div class="truncate font-medium">{{ getName(db) || 'database' }}</div>
            <div class="text-xs nfz-title/45">{{ db.sizeOnDisk ? `${db.sizeOnDisk} bytes` : 'database' }}</div>
          </div>
        </div>
      </button>
    </div>

    <div v-if="!items.length && !loading" class="mt-4 rounded-4 border border-dashed border-white/10 px-3 py-4 text-sm nfz-title/45">
      Aucune base détectée.
    </div>
  </section>
</template>
