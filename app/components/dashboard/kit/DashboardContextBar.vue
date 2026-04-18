<script setup lang="ts">
export interface DashboardContextItem {
  label: string
  value?: string
  icon?: string
  tone?: 'default' | 'primary' | 'positive' | 'warning' | 'info'
}

const props = withDefaults(defineProps<{
  items: DashboardContextItem[]
  compact?: boolean
}>(), {
  compact: false
})

function toneClass(item: DashboardContextItem) {
  if (item.tone === 'primary') return 'builder-chip-primary'
  if (item.tone === 'positive') return 'builder-chip-positive'
  if (item.tone === 'warning') return 'builder-chip-warning'
  if (item.tone === 'info') return 'dash-chip-info'
  return 'builder-chip'
}
</script>

<template>
  <div :class="compact ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2'">
    <div
      v-for="item in props.items"
      :key="`${item.label}:${item.value || ''}`"
      :class="toneClass(item)"
      class="inline-flex items-center gap-1.5"
    >
      <QIcon v-if="item.icon" :name="item.icon" size="14px" />
      <span class="font-700">{{ item.label }}</span>
      <span v-if="item.value" class="opacity-80">{{ item.value }}</span>
    </div>
  </div>
</template>
