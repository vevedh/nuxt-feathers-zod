<script setup lang="ts">
const props = withDefaults(defineProps<{
  compact?: boolean
  separated?: boolean
  align?: 'start' | 'end' | 'between'
  wrap?: boolean
}>(), {
  compact: false,
  separated: false,
  align: 'start',
  wrap: true,
})

const toolbarClass = computed(() => {
  const gap = props.compact ? 'gap-1.5' : 'gap-2'
  const justify = props.align === 'end' ? 'justify-end' : props.align === 'between' ? 'justify-between' : 'justify-start'
  const wrap = props.wrap ? 'flex-wrap' : 'flex-nowrap overflow-x-auto'
  return `dash-toolbar ${gap} ${justify} ${wrap}`
})
</script>

<template>
  <div :class="toolbarClass">
    <slot />
  </div>
  <QSeparator v-if="separated" class="mt-3" />
</template>
