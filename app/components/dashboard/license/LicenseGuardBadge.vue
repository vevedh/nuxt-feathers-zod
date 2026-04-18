<script setup lang="ts">
const props = withDefaults(defineProps<{
  state: 'enabled' | 'disabled' | 'locked'
  hint?: string
}>(), {
  hint: '',
})

const badge = computed(() => {
  if (props.state === 'enabled') return { color: 'positive', icon: 'mdi-check-circle-outline', label: 'Disponible', hint: 'Option disponible dans cette édition et activée au runtime.' }
  if (props.state === 'disabled') return { color: 'warning', icon: 'mdi-cog-off-outline', label: 'Désactivé', hint: 'Option autorisée mais désactivée par la configuration runtime.' }
  return { color: 'grey-7', icon: 'mdi-lock-outline', label: 'Verrouillé', hint: 'Option non incluse dans l’édition courante.' }
})
</script>

<template>
  <QBadge :color="badge.color" rounded class="px-2 py-1 text-xs whitespace-nowrap">
    <QIcon :name="badge.icon" size="14px" class="mr-1" />
    {{ badge.label }}
    <QTooltip>{{ hint || badge.hint }}</QTooltip>
  </QBadge>
</template>
