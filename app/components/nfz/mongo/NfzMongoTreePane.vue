<script setup lang="ts">
const props = withDefaults(defineProps<{
  nodes?: any[]
  selectedKey?: string
  expanded?: string[]
  loading?: boolean
  filterText?: string
}>(), {
  nodes: () => [],
  expanded: () => [],
  loading: false,
  filterText: ''
})

const emit = defineEmits<{
  refresh: []
  select: [key: string]
  updateExpanded: [keys: string[]]
  'update:filterText': [value: string]
}>()

const safeNodes = computed(() => Array.isArray(props.nodes) ? props.nodes : [])
const safeExpanded = computed(() => Array.isArray(props.expanded) ? props.expanded : [])
</script>

<template>
  <section class="nfz-panel mongo-pane rounded-6 h-full p-4 md:p-5">
    <div class="mb-4 flex items-center justify-between gap-2">
      <div>
        <div class="text-xs uppercase tracking-[0.24em] text-[var(--nfz-primary)]">MongoDB</div>
        <h2 class="text-lg font-semibold nfz-title">Tree View</h2>
      </div>
      <QBtn flat color="primary" icon="refresh" round :loading="props.loading" @click="emit('refresh')" />
    </div>

    <QInput
      :model-value="props.filterText"
      outlined
      dense
      clearable
      class="mb-4 mongo-search-field"
      label="Filtrer bases / collections"
      @update:model-value="emit('update:filterText', String($event ?? ''))"
    >
      <template #prepend><QIcon name="search" /></template>
    </QInput>

    <QTree
      :nodes="safeNodes"
      node-key="key"
      :selected="props.selectedKey"
      :expanded="safeExpanded"
      dense
      color="primary"
      class="text-sm nfz-title mongo-tree"
      @update:selected="emit('select', String($event || ''))"
      @update:expanded="emit('updateExpanded', ($event as string[]) || [])"
    >
      <template #default-header="prop">
        <div class="flex items-center gap-2 nfz-title/90">
          <QIcon :name="prop.node.icon || 'dns'" size="16px" class="text-[var(--nfz-secondary)]" />
          <span class="truncate">{{ prop.node.label }}</span>
        </div>
      </template>
    </QTree>

    <div v-if="!safeNodes.length && !props.loading" class="mt-4 rounded-4 border border-dashed border-[var(--nfz-border)] px-3 py-4 text-sm nfz-subtitle">
      Aucune base détectée.
    </div>
  </section>
</template>
