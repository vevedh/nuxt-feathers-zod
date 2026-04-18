<script setup lang="ts">
export interface DashboardWorkspaceTabItem {
  name: string
  label: string
  icon?: string
  caption?: string
  badge?: string | number
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  tabs: DashboardWorkspaceTabItem[]
  keepAlive?: boolean
  vertical?: boolean
  dense?: boolean
  mobileScrollable?: boolean
}>(), {
  keepAlive: true,
  vertical: false,
  dense: true,
  mobileScrollable: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const activeTab = computed(() => props.tabs.find(tab => tab.name === props.modelValue))
const tabsClass = computed(() => {
  const base = 'builder-tabbar rounded-5 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)] px-2 py-2'
  if (props.vertical) return `${base} h-fit`
  return props.mobileScrollable ? `${base} overflow-x-auto whitespace-nowrap` : base
})
</script>

<template>
  <div :class="vertical ? 'grid min-w-0 gap-4 md:grid-cols-[190px_minmax(0,1fr)]' : 'grid min-w-0 gap-4'">
    <div class="min-w-0">
      <QTabs
        :model-value="modelValue"
        :vertical="vertical"
        :dense="dense"
        :class="tabsClass"
        active-color="primary"
        indicator-color="primary"
        align="left"
        @update:model-value="emit('update:modelValue', $event as string)"
      >
        <QTab
          v-for="tab in tabs"
          :key="tab.name"
          :name="tab.name"
          :icon="tab.icon"
          :label="tab.label"
          :disable="tab.disabled"
          no-caps
          class="rounded-4"
        >
          <QBadge v-if="tab.badge !== undefined && tab.badge !== ''" class="ml-2" color="primary" rounded>{{ tab.badge }}</QBadge>
          <QTooltip v-if="tab.caption">{{ tab.caption }}</QTooltip>
        </QTab>
      </QTabs>
      <div v-if="activeTab?.caption && !vertical" class="mt-2 px-1 text-xs nfz-subtitle">
        {{ activeTab.caption }}
      </div>
    </div>

    <QTabPanels
      :model-value="modelValue"
      animated
      :keep-alive="keepAlive"
      class="builder-pane min-w-0 overflow-hidden"
      @update:model-value="emit('update:modelValue', $event as string)"
    >
      <slot />
    </QTabPanels>
  </div>
</template>
