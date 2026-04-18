<script setup lang="ts">
import DashboardContextBar from './DashboardContextBar.vue'
import type { DashboardContextItem } from './DashboardContextBar.vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  kicker?: string
  compact?: boolean
  badges?: DashboardContextItem[]
  collapsible?: boolean
  defaultOpen?: boolean
}>(), {
  subtitle: '',
  kicker: '',
  compact: false,
  badges: () => [],
  collapsible: false,
  defaultOpen: true,
})

const isOpen = ref(props.defaultOpen)
watch(() => props.defaultOpen, value => isOpen.value = value)
const bodySpacingClass = computed(() => props.compact ? 'mt-3 grid gap-3' : 'mt-4 grid gap-4')
</script>

<template>
  <QCard flat bordered :class="compact ? 'builder-side-panel p-3' : 'builder-side-panel'">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <div v-if="kicker" class="builder-kicker">{{ kicker }}</div>
        <div :class="compact ? 'text-base font-800 text-[var(--nfz-text)] mt-1' : 'builder-panel-title text-base mt-1'">{{ title }}</div>
        <p v-if="subtitle" class="builder-copy mt-1 text-xs">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 self-start sm:justify-end">
        <slot name="actions" />
        <QBtn
          v-if="collapsible"
          dense
          flat
          round
          color="primary"
          :icon="isOpen ? 'expand_less' : 'expand_more'"
          @click="isOpen = !isOpen"
        >
          <QTooltip>{{ isOpen ? 'Réduire' : 'Développer' }}</QTooltip>
        </QBtn>
      </div>
    </div>
    <DashboardContextBar v-if="badges.length && isOpen" class="mt-3" :items="badges" compact />
    <div v-show="isOpen" :class="bodySpacingClass">
      <slot />
    </div>
  </QCard>
</template>
